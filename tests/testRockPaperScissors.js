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

describe("RockPaperScissors", function () {
    beforeEach(async function(){
        this.accounts = await ethers.getSigners();

        //Deploy RPSToken
        this.RPSToken = await ethers.getContractFactory("RPSToken");
        this._RPSToken = await this.RPSToken.deploy(ethers.utils.parseUnits('10000000',"ether"));
        await this._RPSToken.deployed();

        //Transfer token to accounts
        await this._RPSToken.transfer(this.accounts[1].address, ethers.utils.parseUnits('10000',"ether"));
        await this._RPSToken.transfer(this.accounts[2].address, ethers.utils.parseUnits('10000',"ether"));

        //Deploy RockPaperScissors
        this.RockPaperScissors = await ethers.getContractFactory("RockPaperScissors");
        this.rockPaperScissors = await this.RockPaperScissors.deploy(this._RPSToken.address);
        await this.rockPaperScissors.deployed();
    });

    it("Should play a match succesful...", async function () {
        //Create
        let keyword = getRandomString();
        let move = getRandomMove();
        let hashedString = ethers.utils.solidityKeccak256(["uint8", "string"], [move, keyword]);
        let approveAccount1 = await this._RPSToken.connect(this.accounts[1]).approve(this.rockPaperScissors.address, ethers.utils.parseUnits('200',"ether"));
        let createMatchTx = await this.rockPaperScissors.connect(this.accounts[1]).createMatch(this.accounts[2].address, ethers.utils.parseUnits('150',"ether"), hashedString);
        let receiptCreateMatchTx = await createMatchTx.wait();
        let matchId = filterEvent(receiptCreateMatchTx, 'MatchCreated')['matchId'];

        //Answer
        let move2 = getRandomMove();
        let approveAccount2 = await this._RPSToken.connect(this.accounts[2]).approve(this.rockPaperScissors.address, ethers.utils.parseUnits('200',"ether"));
        let answerMatchTx = await this.rockPaperScissors.connect(this.accounts[2]).answerMatch(matchId, move2);

        //Close
        let closeMatchTx = await this.rockPaperScissors.connect(this.accounts[1]).closeMatch(matchId, keyword);
        let receiptCloseMatchTx = await closeMatchTx.wait();
        console.log('move a: '+move, 'move d: '+move2, 'winner: '+filterEvent(receiptCloseMatchTx, 'MatchClosed')['winner'], 'loser: '+filterEvent(receiptCloseMatchTx, 'MatchClosed')['loser']);
    });
});