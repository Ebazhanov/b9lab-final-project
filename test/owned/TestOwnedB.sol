pragma solidity ^0.5.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import { OwnedI } from "../../contracts/interfaces/OwnedI.sol";
import { MultiplierHolder } from "../../contracts/MultiplierHolder.sol";
import { TollBoothHolder } from "../../contracts/TollBoothHolder.sol";

contract TestOwnedB {

    uint instanceCount = 2;

    function createInstance(uint index) private returns(OwnedI) {
        if (index == 0) {
            return new MultiplierHolder();
        } else if (index == 1) {
            return new TollBoothHolder();
        } else {
            revert();
        }
    }

    function testInitialOwner() public {
        OwnedI owned;
        for(uint index = 0; index < instanceCount; index++) {
            owned = createInstance(index);
            Assert.equal(owned.getOwner(), address(this), "Should have set owner");
        }
    }

    function testCanChangeOwner() public {
        OwnedI owned;
        for(uint index = 0; index < instanceCount; index++) {
            owned = createInstance(index);
            address newOwner = 0x0123456789abcDEF0123456789abCDef01234567;
            Assert.isTrue(owned.setOwner(newOwner), "Should have changed owner");
            Assert.equal(owned.getOwner(), newOwner, "Should have changed owner");
        }
    }
}
