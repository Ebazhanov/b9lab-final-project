pragma solidity ^0.5.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import { TollBoothHolderI } from  "../../contracts/interfaces/TollBoothHolderI.sol";
import { RoutePriceHolderI } from  "../../contracts/interfaces/RoutePriceHolderI.sol";
import { RoutePriceHolderMock } from "../../contracts/mock/RoutePriceHolderMock.sol";

contract TestRoutePriceHolderA {

    uint instanceCount = 1;

    function createInstance(uint index) private returns(RoutePriceHolderI) {
        if (index == 0) {
            return new RoutePriceHolderMock();
        } else {
            revert();
        }
    }

    function testInitialTollBoothHoldingValues() public {
        TollBoothHolderI holder;
        for(uint index = 0; index < instanceCount; index++) {
            holder = TollBoothHolderI(address(createInstance(index)));

            Assert.isFalse(holder.isTollBooth(address(this)), "Should not be a toll booth");
            Assert.isFalse(holder.isTollBooth(msg.sender), "Should not be a toll booth, sender");
        }
    }

    function testCanAddTollBooth() public {
        TollBoothHolderI holder;
        for(uint index = 0; index < instanceCount; index++) {
            holder = TollBoothHolderI(address(createInstance(index)));

            Assert.isFalse(holder.isTollBooth(address(this)), "Should not be a toll booth");
            Assert.isTrue(holder.addTollBooth(address(this)), "Should have been able to add toll booth");
            Assert.isTrue(holder.isTollBooth(address(this)), "Should now be a toll booth");
        }
    }

    function testInitialRoutePrices() public {
        RoutePriceHolderI holder;
        for(uint index = 0; index < instanceCount; index++) {
            holder = createInstance(index);

            Assert.equal(holder.getRoutePrice(address(this), msg.sender), 0, "Should have 0 for 0");
            Assert.equal(holder.getRoutePrice(msg.sender, address(this)), 0, "Should have 0 for 1");
        }
    }

    function testCanSetRoutePrice() public {
        RoutePriceHolderI holder;
        for(uint index = 0; index < instanceCount; index++) {
            holder = createInstance(index);

            Assert.isTrue(TollBoothHolderI(address(holder)).addTollBooth(address(this)), "Should have been able to add toll booth");
            Assert.isTrue(TollBoothHolderI(address(holder)).addTollBooth(msg.sender), "Should have been able to add toll booth");

            Assert.isTrue(holder.setRoutePrice(address(this), msg.sender, 1), "Should have been able to set a price");
            Assert.equal(holder.getRoutePrice(address(this), msg.sender), 1, "Should have set price now");
            Assert.equal(holder.getRoutePrice(msg.sender, address(this)), 0, "Should still have price set at 0 on reverse route");
        }
    }

    function testCanSetRoutePriceBackToZero() public {
        RoutePriceHolderI holder;
        for(uint index = 0; index < instanceCount; index++) {
            holder = createInstance(index);

            Assert.isTrue(TollBoothHolderI(address(holder)).addTollBooth(address(this)), "Should have been able to add toll booth");
            Assert.isTrue(TollBoothHolderI(address(holder)).addTollBooth(msg.sender), "Should have been able to add toll booth");

            Assert.isTrue(holder.setRoutePrice(address(this), msg.sender, 1), "Should have been able to set a price");
            Assert.isTrue(holder.setRoutePrice(address(this), msg.sender, 0), "Should have been able to unset the price");
            Assert.equal(holder.getRoutePrice(address(this), msg.sender), 0, "Should now have price set at 0");
        }
    }

    function testCanAddAndRemoveManyRoutePrices_RoutePriceHolderMock() public {
        RoutePriceHolderI holder = createInstance(0);

        uint count = 60;

        for (uint i = 1; i <= count + 1; i++) {
            Assert.isTrue(TollBoothHolderI(address(holder)).addTollBooth(address(i)), "Should have been able to add toll booth");
        }
        for (uint i = 1; i <= count; i++) {
            Assert.isTrue(holder.setRoutePrice(address(i), address(i + 1), i), "Should have been able to set price");
        }
        for (uint i = 1; i <= count; i++) {
            Assert.equal(holder.getRoutePrice(address(i), address(i + 1)), i, "Should now have a price");
        }
    }
}
