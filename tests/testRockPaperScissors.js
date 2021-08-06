const { expect } = require("chai");

function getRandomMove(){
    let arr = [1,2,3];
    return arr[Math.floor(Math.random()*arr.length)];
}

function getRandomString(){
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function filterEvent(receipt, eventName){
    for (let i = 0; i < receipt.events.length; i++) {
        const element = receipt.events[i];
        if (element.event == eventName){
            return element.args;
        }
    }
}

function determineWinner(attackerMove, defenderMove, attackerAddress, defenderAddress){
    if (attackerMove == defenderMove)
        return {
            "winner": ethers.constants.AddressZero,
            "loser": ethers.constants.AddressZero
        };
    else{
        if ((attackerMove == 1 && defenderMove == 3) || (attackerMove == 3 && defenderMove == 2) || (attackerMove == 2 && defenderMove == 1)){
            return {
                "winner": attackerAddress,
                "loser": defenderAddress
            };
        }
        else {
            return {
                "winner": defenderAddress,
                "loser": attackerAddress
            };
        }
    }
}

let initialRPSBalance = 10000;
let betNumber = 150;

describe("RockPaperScissors", function () {
    //Deploy
    beforeEach(async function(){
        this.accounts = await ethers.getSigners();

        //Deploy RPSToken
        this.RPSToken = await ethers.getContractFactory("RPSToken");
        this._RPSToken = await this.RPSToken.deploy(ethers.utils.parseUnits('10000000',"ether"));
        await this._RPSToken.deployed();

        //Transfer token to accounts
        await this._RPSToken.transfer(this.accounts[1].address, ethers.utils.parseUnits(String(initialRPSBalance),"ether"));
        await this._RPSToken.transfer(this.accounts[2].address, ethers.utils.parseUnits(String(initialRPSBalance),"ether"));

        //Deploy RockPaperScissors
        this.RockPaperScissors = await ethers.getContractFactory("RockPaperScissors");
        this.rockPaperScissors = await this.RockPaperScissors.deploy(this._RPSToken.address);
        await this.rockPaperScissors.deployed();
    });

    //Loop 10 times, with random moves
    for (let i = 0; i < 10; i++) {
        it("Should play a match succesfully...", async function () {
            //Create
            let keyword = getRandomString();
            let attackerMove = getRandomMove();
            let hashedString = ethers.utils.solidityKeccak256(["uint8", "string"], [attackerMove, keyword]);
            let approveAccount1 = await this._RPSToken.connect(this.accounts[1]).approve(this.rockPaperScissors.address, ethers.utils.parseUnits(String(betNumber + (betNumber * 2 / 100)),"ether"));
            let createMatchTx = await this.rockPaperScissors.connect(this.accounts[1]).createMatch(this.accounts[2].address, ethers.utils.parseUnits(String(betNumber),"ether"), hashedString);
            let receiptCreateMatchTx = await createMatchTx.wait();
            let matchId = filterEvent(receiptCreateMatchTx, 'MatchCreated')['matchId'];

            //Answer
            let defenderMove = getRandomMove();
            let approveAccount2 = await this._RPSToken.connect(this.accounts[2]).approve(this.rockPaperScissors.address, ethers.utils.parseUnits(String(betNumber),"ether"));
            let answerMatchTx = await this.rockPaperScissors.connect(this.accounts[2]).answerMatch(matchId, defenderMove);

            //Close
            let closeMatchTx = await this.rockPaperScissors.connect(this.accounts[1]).closeMatch(matchId, keyword);
            let receiptCloseMatchTx = await closeMatchTx.wait();

            let { winner, loser} = determineWinner(attackerMove, defenderMove, this.accounts[1].address, this.accounts[2].address);
            let winnerContractOutput = filterEvent(receiptCloseMatchTx, 'MatchClosed')['winner'];
            let loserContractOuput = filterEvent(receiptCloseMatchTx, 'MatchClosed')['loser'];
            expect(winner).equals(winnerContractOutput);
            expect(loser).equals(loserContractOuput);
            let attackerBalance = await this._RPSToken.balanceOf(this.accounts[1].address);
            let defenderBalance = await this._RPSToken.balanceOf(this.accounts[2].address);
            
            if (loser != winner){
                //Diferents
                if (winner == this.accounts[1].address) {
                    //Winner is attacker
                    expect(Number(ethers.utils.formatUnits(attackerBalance))).equals(betNumber + initialRPSBalance);
                    expect(Number(ethers.utils.formatUnits(defenderBalance))).equals( initialRPSBalance - betNumber);
                }else{
                    //Loser is attacker
                    expect(Number(ethers.utils.formatUnits(defenderBalance))).equals(betNumber + initialRPSBalance);
                    expect(Number(ethers.utils.formatUnits(attackerBalance))).equals(initialRPSBalance - betNumber);
                }
            }else{
                //Equals
                expect(Number(ethers.utils.formatUnits(attackerBalance))).equals(initialRPSBalance);
                expect(Number(ethers.utils.formatUnits(defenderBalance))).equals(initialRPSBalance);
            }  
        });
    }

    //Loop 10 times, with random moves
    for (let i = 0; i < 10; i++) {
        it("Should create a match, defender joins, and attacker left the match, then defender claims refund...", async function(){
            //Create
            let keyword = getRandomString();
            let attackerMove = getRandomMove();
            let hashedString = ethers.utils.solidityKeccak256(["uint8", "string"], [attackerMove, keyword]);
            let approveAccount1 = await this._RPSToken.connect(this.accounts[1]).approve(this.rockPaperScissors.address, ethers.utils.parseUnits('200',"ether"));
            let createMatchTx = await this.rockPaperScissors.connect(this.accounts[1]).createMatch(this.accounts[2].address, ethers.utils.parseUnits(String(betNumber),"ether"), hashedString);
            let receiptCreateMatchTx = await createMatchTx.wait();
            let matchId = filterEvent(receiptCreateMatchTx, 'MatchCreated')['matchId'];

            //Answer
            let defenderMove = getRandomMove();
            let approveAccount2 = await this._RPSToken.connect(this.accounts[2]).approve(this.rockPaperScissors.address, ethers.utils.parseUnits('200',"ether"));
            let answerMatchTx = await this.rockPaperScissors.connect(this.accounts[2]).answerMatch(matchId, defenderMove);

            //Time travelling!
            await ethers.provider.send('evm_increaseTime', [691200]); //Increase time in 8 days

            //Refund
            let defenderRefundMatchTx = await this.rockPaperScissors.connect(this.accounts[2]).defenderRefundMatch(matchId);
            let defenderBalance = await this._RPSToken.balanceOf(this.accounts[2].address);
            expect(Number(ethers.utils.formatUnits(defenderBalance))).equals((betNumber + initialRPSBalance) + (betNumber * 2 / 100));
        });
    }

    //Loop 10 times, with random moves
    for (let i = 0; i < 10; i++) {
        it("Should create a match, defender never joins, then attacker claims refund...", async function(){
            //Create
            let keyword = getRandomString();
            let attackerMove = getRandomMove();
            let hashedString = ethers.utils.solidityKeccak256(["uint8", "string"], [attackerMove, keyword]);
            let approveAccount1 = await this._RPSToken.connect(this.accounts[1]).approve(this.rockPaperScissors.address, ethers.utils.parseUnits('200',"ether"));
            let createMatchTx = await this.rockPaperScissors.connect(this.accounts[1]).createMatch(this.accounts[2].address, ethers.utils.parseUnits(String(betNumber),"ether"), hashedString);
            let receiptCreateMatchTx = await createMatchTx.wait();
            let matchId = filterEvent(receiptCreateMatchTx, 'MatchCreated')['matchId'];

            //Time travelling!
            await ethers.provider.send('evm_increaseTime', [691200]); //Increase time in 8 days

            //Refund
            let attackerRefundMatchTx = await this.rockPaperScissors.connect(this.accounts[1]).attackerRefundMatch(matchId);
            let attackerBalance = await this._RPSToken.balanceOf(this.accounts[1].address);
            expect(Number(ethers.utils.formatUnits(attackerBalance))).equals(initialRPSBalance);
        });
    }
});