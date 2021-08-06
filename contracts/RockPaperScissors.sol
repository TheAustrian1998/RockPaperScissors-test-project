//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RockPaperScissors {

    constructor(address _RPSToken){
        RPSToken = _RPSToken;
    }

    enum MatchStatus { WAITING, ANSWERING, CLOSED }
    enum Moves { NONE, ROCK, PAPER, SCISSORS}
    struct Match {
        address attacker;
        address defender;
        bytes32 attackerMove;
        Moves defenderMove;
        MatchStatus status;
        uint256 bet;
        uint256 deadline;
    }

    mapping(bytes32 => Match) public matchesMapping;
    address public RPSToken;
    uint8 constant collateralBet = 2;

    event MatchCreated(bytes32 matchId, address attacker, address defender);
    event MatchAnswered(bytes32 matchId);
    event MatchClosed(bytes32 matchId, address winner, address loser);

    function _determineWinner(Moves attackerMove, Moves defenderMove, Match memory _match) private returns (address, address){
        //Determine results, and returns (winner, loser)

        if (attackerMove == Moves.NONE) {
            //Attacker submitted a invalid move, penalized. Defender wins
            IERC20(RPSToken).transfer(_match.defender, (_match.bet * 2) + (_match.bet * collateralBet / 100));
            return (_match.defender,_match.attacker);
        }

        if (attackerMove == defenderMove) {
            //Equals
            IERC20(RPSToken).transfer(_match.attacker, _match.bet + (_match.bet * collateralBet / 100));
            IERC20(RPSToken).transfer(_match.defender, _match.bet);
            return (address(0),address(0));
        }

        if ((attackerMove == Moves.ROCK && defenderMove == Moves.SCISSORS) || (attackerMove == Moves.SCISSORS && defenderMove == Moves.PAPER) || (attackerMove == Moves.PAPER && defenderMove == Moves.ROCK)){
            //Attacker wins
            IERC20(RPSToken).transfer(_match.attacker, (_match.bet * 2) + (_match.bet * collateralBet / 100));
            return (_match.attacker,_match.defender);
        }else{
            //defender wins
            IERC20(RPSToken).transfer(_match.defender, _match.bet * 2);
            IERC20(RPSToken).transfer(_match.attacker, (_match.bet * collateralBet / 100));
            return (_match.defender,_match.attacker);
        }
    }

    function createMatch(address defender, uint256 bet, bytes32 move) public {
        //Attacker creates a match, leaves X% of bet as collateral
        //Attacker send his first movement hashed with a keyword. 
        //Example: (2secretkeyword) -> (0x6c0e1651605073f53badf53a266d2501be5f3fc8db215bd81106daca4bcde0db) His secret keyword is "secretkeyword" and his movement is "PAPER".
        bytes32 matchId = keccak256(abi.encodePacked(block.number, msg.sender, defender));
        uint256 deadline = block.timestamp + 7 days; //Match expires in seven days
        IERC20(RPSToken).transferFrom(msg.sender, address(this), bet + (bet * collateralBet / 100));
        Match memory newMatch = Match(msg.sender, defender, move, Moves.NONE, MatchStatus.WAITING, bet, deadline);
        matchesMapping[matchId] = newMatch;
        emit MatchCreated(matchId, msg.sender, defender);
    }

    function answerMatch(bytes32 matchId, Moves move) public {
        //Defender answers match
        Match memory _match = matchesMapping[bytes32(matchId)];
        require(_match.defender == msg.sender, "Not your match");
        require(_match.deadline > block.timestamp, "Expired match");
        require(_match.status == MatchStatus.WAITING, "Invalid turn");
        require(move != Moves.NONE, "Not valid move");
        IERC20(RPSToken).transferFrom(msg.sender, address(this), _match.bet);
        _match.status = MatchStatus.ANSWERING;
        _match.defenderMove = move;
        matchesMapping[bytes32(matchId)] = _match;
        emit MatchAnswered(matchId);
    }

    function closeMatch(bytes32 matchId, string memory keyword) public {
        //Attackers close match. Show his secret keyword and discover his movement
        Match memory _match = matchesMapping[bytes32(matchId)];
        require(_match.attacker == msg.sender, "Not your match");
        require(_match.deadline > block.timestamp, "Expired match");
        require(_match.status == MatchStatus.ANSWERING, "Invalid turn");

        Moves attackerMove = Moves.NONE;

        bytes32 tryROCK = keccak256(abi.encodePacked(Moves.ROCK,keyword));
        bytes32 tryPAPER = keccak256(abi.encodePacked(Moves.PAPER,keyword));
        bytes32 trySCISSORS = keccak256(abi.encodePacked(Moves.SCISSORS,keyword));
        if (tryROCK == _match.attackerMove) attackerMove = Moves.ROCK;
        if (tryPAPER == _match.attackerMove) attackerMove = Moves.PAPER;
        if (trySCISSORS == _match.attackerMove) attackerMove = Moves.SCISSORS;

        (address winner, address loser) = _determineWinner(attackerMove,_match.defenderMove, _match);
        _match.status = MatchStatus.CLOSED;
        matchesMapping[bytes32(matchId)] = _match;
        emit MatchClosed(matchId, winner, loser);
    }

    function defenderRefundMatch(bytes32 matchId) public {
        //Defender request a refund. Only if deadline is fulfilled. 
        Match memory _match = matchesMapping[bytes32(matchId)];
        require(_match.defender == msg.sender, 'Not allowed');
        require(_match.deadline < block.timestamp, "This match is live");
        require(_match.status == MatchStatus.ANSWERING, 'Not in "ANSWERING"');
        IERC20(RPSToken).transfer(msg.sender, (_match.bet * 2) + (_match.bet * collateralBet / 100));
    }

    function attackerRefundMatch(bytes32 matchId) public {
        //Attacker request a refund. Only if deadline is fulfilled. 
        Match memory _match = matchesMapping[bytes32(matchId)];
        require(_match.attacker == msg.sender, 'Not allowed');
        require(_match.deadline < block.timestamp, "This match is live");
        require(_match.status == MatchStatus.WAITING, 'Not in "WAITING"');
        IERC20(RPSToken).transfer(msg.sender, _match.bet + (_match.bet * collateralBet / 100));
    }
}