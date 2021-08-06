***(Dev notes below)***

------

## RockPaperScissors test project

You will create a smart contract named `RockPaperScissors` whereby:  
Alice and Bob can play the classic game of rock, paper, scissors using ERC20 (of your choosing).    

- To enroll, each player needs to deposit the right token amount, possibly zero.  
- To play, each Bob and Alice need to submit their unique move.  
- The contract decides and rewards the winner with all token wagered.  

There are many ways to implement this, so we leave that up to you.  

## Stretch Goals
Nice to have, but not necessary.
- Make it a utility whereby any 2 people can decide to play against each other.  
- Reduce gas costs as much as possible.
- Let players bet their previous winnings.  
- How can you entice players to play, knowing that they may have their funds stuck in the contract if they face an uncooperative player?  
- Include any tests using Hardhat.
  

Now fork this repo and do it!

When you're done, please send an email to zak@slingshot.finance (if you're not applying through Homerun) with a link to your fork or join the [Slingshot Discord channel](https://discord.gg/JNUnqYjwmV) and let us know.  

Happy hacking!

------

## **Dev notes**

How to play rock, paper, scissors:

1) **Create a match:** call function **createMatch()** in Contract with parameters defender (opponent), bet (amount to bet) and move (hashed movement 1=ROCK, 2=PAPER, 3=SCISSORS, concatenated with a secret keyword). The contract extract 2% more of RSP Token as collateral. Give the matchId to your opponent.
2) **Opponent answers match:** defender calls **answerMatch()** passing matchId and playing his bare movement.
3) **Attacker or challenger close the match:** the match creator (you), calls function **closeMatch()** passing his secret keyword in parms. The contract decides the winner and send prizes.

In the case that opponent (defender) never joins the match or attacker (you) never call **closeMatch()**, the user can call a function to refund locked funds if deadline is fulfilled (7 days).

For defender the function to refund is **defenderRefundMatch()**, for attacker the function is **attackerRefundMatch()**.

