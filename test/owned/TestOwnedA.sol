pragma solidity ^0.5.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import { OwnedI } from "../../contracts/interfaces/OwnedI.sol";
import { Owned } from "../../contracts/Owned.sol";
import { Pausable } from "../../contracts/Pausable.sol";
import { Regulator } from "../../contracts/Regulator.sol";
import { DepositHolder } from "../../contracts/DepositHolder.sol";

// If you have an out-of-gas error when testing this file, try launching
// ganache-cli -l 15000000 --allowUnlimitedContractSize

contract TestOwnedA {

    uint instanceCount = 4;

    function createInstance(uint index) private returns(OwnedI) {
        if (index == 0) {
            return new Owned();
        } else if (index == 1) {
            return new Pausable(false);
        } else if (index == 2) {
            return new Regulator();
        } else if (index == 3) {
            return new DepositHolder(1);
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
