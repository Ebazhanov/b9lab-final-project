pragma solidity ^0.5.0;

import { Owned } from "../Owned.sol";
import { TollBoothHolder } from "../TollBoothHolder.sol";
import { RoutePriceHolder } from "../RoutePriceHolder.sol";

contract RoutePriceHolderMock is TollBoothHolder, RoutePriceHolder {

    constructor() public {
    }
}