pragma solidity ^0.5.0;

import { Pausable } from "../Pausable.sol";

contract PausableMock is Pausable {

    mapping(bool => uint) public counters;

    constructor(bool paused) Pausable(paused) public {
    }

    function countUpWhenPaused()
        whenPaused public {
        counters[isPaused()]++;
    }

    function countUpWhenNotPaused()
        whenNotPaused public {
        counters[isPaused()]++;
    }
}