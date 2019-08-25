pragma solidity ^0.5.0;

contract RoutePriceHolderI {

    /**
     * Event emitted when a new price has been set on a route.
     * @param sender The account that ran the action.
     * @param entryBooth The address of the entry booth of the route set.
     * @param exitBooth The address of the exit booth of the route set.
     * @param priceWeis The price in weis of the new route.
     */
    event LogRoutePriceSet(
        address indexed sender,
        address indexed entryBooth,
        address indexed exitBooth,
        uint priceWeis);

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
        returns(bool success);

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
        returns(uint priceWeis);

    /*
     * You need to create:
     *
     * - a contract named `RoutePriceHolder` that:
     *     - is `OwnedI`, `TollBoothHolderI`, and `RoutePriceHolderI`.
     *     - has a constructor that takes no parameter, or you omit it.
     */
}