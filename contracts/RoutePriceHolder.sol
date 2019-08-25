pragma solidity ^0.5.0;

import './Owned.sol';
import './interfaces/TollBoothHolderI.sol';
import './interfaces/RoutePriceHolderI.sol';

contract RoutePriceHolder is Owned,TollBoothHolderI,RoutePriceHolderI{
    constructor() public {
    }
    mapping(bytes32=>uint) routePrice;
    /**
     * Called by the owner of the RoutePriceHolder.
     *     It can be used to update the price of a route, including to zero.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if one of the booths is not a registered booth.
     *     It should roll back if entry and exit booths are the same.
     *     It should roll back if either booth is a 0x address.
     *     It should roll back if there is no change in price.
     * @param entryBooth The address of the entry booth of the route set.
     * @param exitBooth The address of the exit booth of the route set.
     * @param priceWeis The price in weis of the new route.
     * @return Whether the action was successful.
     * Emits LogPriceSet with:
     *     The sender of the action.
     *     The address of the entry booth.
     *     The address of the exit booth.
     *     The new price of the route.
     */
    function setRoutePrice(
            address entryBooth,
            address exitBooth,
            uint priceWeis)
        public
        fromOwner
        returns(bool success){
            require(entryBooth!=exitBooth,"Entry and exit booths are the same");
            require(entryBooth!=address(0) && exitBooth!=address(0),"Both addresses must be valid");
            require(isTollBooth(entryBooth)==true && isTollBooth(exitBooth)==true,"The booths are not registered");
            bytes32 routeHash = keccak256(abi.encode(entryBooth,exitBooth));
            require(routePrice[routeHash]!=priceWeis,"There is no change in price");
            routePrice[routeHash] = priceWeis;
            emit LogRoutePriceSet(
            msg.sender,
            entryBooth,
            exitBooth,
            priceWeis);
            success = true;
        }

    /**
     * @param entryBooth The address of the entry booth of the route. It should accept a 0 address.
     * @param exitBooth The address of the exit booth of the route. It should accept a 0 address.
     * @return priceWeis The price in weis of the route.
     *     If the route is not known or if any address is not a booth it should return 0.
     *     If the route is invalid, it should return 0.
     */
    function getRoutePrice(
            address entryBooth,
            address exitBooth)
        view
        public
        returns(uint priceWeis){
            priceWeis = routePrice[keccak256(abi.encode(entryBooth,exitBooth))];
        }
}