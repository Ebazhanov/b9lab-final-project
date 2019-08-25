pragma solidity ^0.5.0;

import { TollBoothOperator } from "../TollBoothOperator.sol";
import { PullPaymentMock } from "./PullPaymentMock.sol";

contract TollBoothOperatorMock is TollBoothOperator, PullPaymentMock {

    constructor(bool paused, uint depositWeis, address regulator)
    	TollBoothOperator(paused, depositWeis, regulator)
    	public {
    }
}