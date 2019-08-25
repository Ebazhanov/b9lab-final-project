pragma solidity ^0.5.0;

import { PullPaymentA } from "../interfaces/PullPaymentA.sol";

/**
 * @dev Used to enforce a lot of gas is passed with a `.call.value`.
 */
contract GreedyRecipient {

    uint public minGas;
    uint public expectedValue;
    bool public happened;
    bool public receivedOk;

    constructor() public {
    }

    function withdrawPaymentFrom(PullPaymentA where, uint _minGas) public returns (bool success) {
        minGas = _minGas;
        expectedValue = where.getPayment(address(this));
        return where.withdrawPayment();
    }

    function() external payable {
        require(!happened);
        happened = true;
        receivedOk = minGas <= gasleft() && msg.value == expectedValue;
    }
}