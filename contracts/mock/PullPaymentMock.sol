pragma solidity ^0.5.0;

import { PullPayment } from "../PullPayment.sol";

contract PullPaymentMock is PullPayment {

    constructor() public {
    }

    function straightDeposit(address whom) public payable {
        asyncPayTo(whom, msg.value);
    }

    function fakeAsyncPayTo(address whom, uint amount) public {
    	asyncPayTo(whom, amount);
    }
}