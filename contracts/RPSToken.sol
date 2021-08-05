//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RPSToken is ERC20 {
    constructor(uint256 initSupply) ERC20("RPS Token", "RPS"){
        _mint(msg.sender, initSupply);
    }
}