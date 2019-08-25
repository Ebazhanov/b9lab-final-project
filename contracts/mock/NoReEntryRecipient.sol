pragma solidity ^0.5.0;

import { PullPaymentA } from "../interfaces/PullPaymentA.sol";

/**
 * @dev Used to confirm there is a reentry mitigation strategy on the PullPayment.
 */
contract NoReEntryRecipient {

    uint public expectedValue;
    bool public happened;
    bool public receivedOk;

    constructor() public {
    }

    function withdrawPaymentFrom(PullPaymentA where) public returns (bool success) {
        expectedValue = where.getPayment(address(this));
        return where.withdrawPayment();
    }

    function() external payable {
        require(!happened);
        happened = true;
        receivedOk = PullPaymentA(msg.sender).getPayment(address(this)) == 0
            && msg.value == expectedValue;
    }
}