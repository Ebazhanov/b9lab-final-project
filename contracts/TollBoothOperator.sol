pragma solidity ^0.5.0;

import './Owned.sol';
import './Pausable.sol';
import './Regulated.sol';
import './MultiplierHolder.sol';
import './DepositHolder.sol';
import './TollBoothHolder.sol';
import './RoutePriceHolder.sol';
import './PullPayment.sol';
import './interfaces/TollBoothOperatorI.sol';
import './interfaces/RoutePriceHolderI.sol';

contract TollBoothOperator is
Owned,
TollBoothHolder,
RoutePriceHolderI,
Pausable,
Regulated,
MultiplierHolder,
DepositHolder,
PullPayment,
TollBoothOperatorI{

    constructor(bool initialState, uint initialDeposit, address initialRegulator)
    Pausable(initialState)
    DepositHolder(initialDeposit)
    Regulated(initialRegulator)
    public {
        require(initialDeposit>0,"Initial deposit can not be 0");
        require(initialRegulator!=address(0),"Initial regulator can not be 0");
    }

    function() external payable{
        revert("I reject all incoming calls");
    }

    struct VehicleEntry{
        address payable vehicle;
        address entryBooth;
        uint multiplier;
        uint depositedWeis;
    }
    mapping(bytes32=>VehicleEntry) private usedSecrets;

    mapping(bytes32=>bytes32[]) private pendingPayments;

    /**
     * This provides a single source of truth for the encoding algorithm.
     * It will be called:
     *     - by the vehicle prior to sending a deposit.
     *     - by the contract itself when submitted a clear password by a toll booth.
     * @param secret The secret to be hashed. Passing a `0` secret is a valid input.
     * @return the hashed secret.
     */
    function hashSecret(bytes32 secret)
        view
        public
        returns(bytes32 hashed){
            hashed = keccak256(abi.encode(secret,address(this)));
        }

     /**
     * Called by the vehicle entering a road system.
     * Off-chain, the entry toll booth will open its gate after a successful deposit and a confirmation
     * of the vehicle identity.
     *     It should roll back when the contract is in the `true` paused state.
     *     It should roll back when the vehicle is not a registered vehicle.
     *     It should roll back when the vehicle is not allowed on this road system.
     *     It should roll back if `entryBooth` is not a tollBooth.
     *     It should roll back if less than deposit * multiplier was sent alongside.
     *     It should roll back if `exitSecretHashed` has previously been used by anyone to enter.
     *     It should be possible for a vehicle to enter "again" before it has exited from the 
     *       previous entry.
     * @param entryBooth The declared entry booth by which the vehicle will enter the system.
     * @param exitSecretHashed A hashed secret that when solved allows the operator to pay itself.
     * @return Whether the action was successful.
     * Emits LogRoadEntered with:
     *     The sender of the action.
     *     The address of the entry booth.
     *     The hashed secret used to deposit.
     *     The multiplier of the vehicle at entry.
     *     The amount deposited by the vehicle.
     */
    function enterRoad(
            address entryBooth,
            bytes32 exitSecretHashed)
        public
        payable
        whenNotPaused
        returns (bool success){
            uint vehicleType = getRegulator().getVehicleType(msg.sender);
            uint multiplier = getMultiplier(vehicleType);
            require(vehicleType!=0,"Vehicle is not registered");
            require(multiplier!=0,"Vehicle not allowed on this route");
            require(isTollBooth(entryBooth)==true,"This is not a toll booth");
            uint amountToPay = getDeposit().mul(multiplier);
            require(msg.value>=amountToPay,"less than deposit * multiplier was sent");
            require(usedSecrets[exitSecretHashed].vehicle==address(0),"This secret has been used");
            usedSecrets[exitSecretHashed].vehicle = msg.sender;
            usedSecrets[exitSecretHashed].entryBooth = entryBooth;
            usedSecrets[exitSecretHashed].multiplier = multiplier;
            usedSecrets[exitSecretHashed].depositedWeis = msg.value;
            emit LogRoadEntered(
                msg.sender,
                entryBooth,
                exitSecretHashed,
                multiplier,
                msg.value);
                success = true;
        }


     /**
     * Called by the exit booth.
     *     It should roll back when the contract is in the `true` paused state.
     *     It should roll back when the sender is not a toll booth.
     *     It should roll back if the exit is same as the entry.
     *     It should roll back if hashing the secret does not match a hashed one.
     *     It should roll back if the secret has already been reported on exit.
     * After a successful exit, the storage should be zeroed out as much as possible.
     * @param exitSecretClear The secret given by the vehicle as it passed by the exit booth. Passing a `0` secret is a valid input.
     * @return status:
     *   1: success, -> emits LogRoadExited with:
     *       The sender of the action.
     *       The hashed secret corresponding to the vehicle trip.
     *       The effective charge paid by the vehicle.
     *       The amount refunded to the vehicle.
     *   2: pending oracle -> emits LogPendingPayment with:
     *       The hashed secret corresponding to the vehicle trip.
     *       The entry booth of the vehicle trip.
     *       The exit booth of the vehicle trip.
     */
    function reportExitRoad(bytes32 exitSecretClear)
        public
        whenNotPaused
        returns (uint status){
            require(isTollBooth(msg.sender)==true,"Sender is not a toll booth");
            bytes32 hash = hashSecret(exitSecretClear);
            address payable vehicle = usedSecrets[hash].vehicle;
            address entryBooth = usedSecrets[hash].entryBooth;
            uint depositedWei = usedSecrets[hash].depositedWeis;
            uint multiplier = usedSecrets[hash].multiplier;
            require(vehicle!=address(0),"This secret has not been used");
            require(entryBooth!=msg.sender,"Exit is the same as entry");
            require(depositedWei!=0,"secret has already been reported on exit");
            uint fee = getRoutePrice(entryBooth,msg.sender);
            if(fee==0){
                emit LogPendingPayment(
                hash,
                entryBooth,
                msg.sender);
                bytes32 routeHash = keccak256(abi.encode(entryBooth,msg.sender));
                pendingPayments[routeHash].push(hash);
                status = 2;
            }else{
                usedSecrets[hash].depositedWeis = 0;
                usedSecrets[hash].multiplier = 0;
                usedSecrets[hash].vehicle = address(0);
                fee = fee.mul(multiplier);
                if(depositedWei>fee){
                    payments[getOwner()] = payments[getOwner()].add(fee);
                    uint amount = depositedWei.sub(fee);
                    payments[vehicle] = payments[vehicle].add(amount);
                    emit LogRoadExited(
                    msg.sender,
                    hash,
                    fee,
                    amount);
                }else{
                    payments[getOwner()] = payments[getOwner()].add(depositedWei);
                    emit LogRoadExited(
                    msg.sender,
                    hash,
                    depositedWei,
                    0);
                }
                status = 1;
            }
        }

    /**
     * @param entryBooth the entry booth that has pending payments.
     * @param exitBooth the exit booth that has pending payments.
     * @return the number of payments that are pending because the price for the
     * entry-exit pair was unknown.
     */
    function getPendingPaymentCount(address entryBooth, address exitBooth)
        view
        public
        returns (uint count){
           bytes32 routeHash = keccak256(abi.encode(entryBooth,exitBooth));
           count = pendingPayments[routeHash].length;
        }

    /**
     * @param exitSecretHashed The hashed secret used by the vehicle when entering the road.
     * @return The information pertaining to the entry of the vehicle.
     *     vehicle: the address of the vehicle that entered the system.
     *     entryBooth: the address of the booth the vehicle entered at.
     *     multiplier: the vehicle's multiplier at entry.
     *     depositedWeis: how much the vehicle deposited when entering.
     * After the vehicle has exited, and the operator has been paid, `depositedWeis` should be returned as `0`.
     *     The `depositedWeis` should remain unchanged while there is a corresponding pending exit.
     * If no vehicles had ever entered with this hash, all values should be returned as `0`.
     */
    function getVehicleEntry(bytes32 exitSecretHashed)
        view
        public
        returns(
            address vehicle,
            address entryBooth,
            uint multiplier,
            uint depositedWeis){
                vehicle = usedSecrets[exitSecretHashed].vehicle;
                entryBooth = usedSecrets[exitSecretHashed].entryBooth;
                multiplier = usedSecrets[exitSecretHashed].multiplier;
                depositedWeis = usedSecrets[exitSecretHashed].depositedWeis;
            }

     /**
     * Can be called by anyone. In case more than 1 payment was pending when the oracle gave a price.
     *     It should roll back when the contract is in `true` paused state.
     *     It should roll back if booths are not really booths.
     *     It should roll back if there are fewer than `count` pending payments that are solvable.
     *     It should roll back if `count` is `0`.
     * After a successful clearing, the storage should be zeroed out as much as possible.
     * @param entryBooth the entry booth that has pending payments.
     * @param exitBooth the exit booth that has pending payments.
     * @param count the number of pending payments to clear for the exit booth.
     * @return Whether the action was successful.
     * Emits LogRoadExited as many times as count, each with:
     *       The address of the exit booth.
     *       The hashed secret corresponding to the vehicle trip.
     *       The effective charge paid by the vehicle.
     *       The amount refunded to the vehicle.
     */
    function clearSomePendingPayments(
            address entryBooth,
            address exitBooth,
            uint count)
        public
        whenNotPaused
        returns (bool success){
            require(isTollBooth(entryBooth)==true&&isTollBooth(exitBooth)==true,"Some booths are not realy booths");
            uint pending = getPendingPaymentCount(entryBooth,exitBooth);
            require(count>0,"Count cannot be 0");
            require(pending>=count,"There are fewer pending payments");
            uint fee = getRoutePrice(entryBooth,exitBooth);
            bytes32 routeHash = keccak256(abi.encode(entryBooth,exitBooth));
            for(uint i = 0;i<=(count-1);i++){
                bytes32 hash = pendingPayments[routeHash][i];
                if(hash!=0){
                uint multiplier = usedSecrets[hash].multiplier;
                uint depositedWei = usedSecrets[hash].depositedWeis;
                address vehicle = usedSecrets[hash].vehicle;

                usedSecrets[hash].depositedWeis = 0;
                usedSecrets[hash].multiplier = 0;
                usedSecrets[hash].vehicle = address(0);

                fee = fee.mul(multiplier);
                if(depositedWei>fee){
                    uint amount = depositedWei.sub(fee);
                    payments[vehicle] = payments[vehicle].add(amount);
                    payments[getOwner()] = payments[getOwner()].add(fee);
                    emit LogRoadExited(
                    exitBooth,
                    hash,
                    fee,
                    amount);
                }else{
                    payments[getOwner()] = payments[getOwner()].add(depositedWei);
                    emit LogRoadExited(
                    exitBooth,
                    hash,
                    depositedWei,
                    0);
                }
            }else{
                success = false;
            }
            }
            for (pending = 0; pending<getPendingPaymentCount(entryBooth,exitBooth)-1; pending++){
                    pendingPayments[keccak256(abi.encode(entryBooth,exitBooth))][pending] = pendingPayments[keccak256(abi.encode(entryBooth,exitBooth))][pending+1];
                }
                pendingPayments[keccak256(abi.encode(entryBooth,exitBooth))].length--;
            success = true;
        }

    mapping(bytes32=>uint) routePrice;
    function getRoutePrice(
            address entryBooth,
            address exitBooth)
        view
        public
        returns(uint priceWeis){
            priceWeis = routePrice[keccak256(abi.encode(entryBooth,exitBooth))];
        }
    /**
     * This function is commented out otherwise it prevents compilation of the completed contracts.
     * This function overrides the eponymous function of `RoutePriceHolderI`, to which it adds the following
     * functionality:
     *     - If relevant, it will release 1 pending payment for this route. As part of this payment
     *       release, it will emit the appropriate `LogRoadExited` event.
     *     - It should be possible to call it even when the contract is in the `true` paused state.
     * After a successful clearing, the storage should be zeroed out as much as possible.
     * Emits LogRoadExited, if applicable, with:
     *       The address of the exit booth.
     *       The hashed secret corresponding to the vehicle trip.
     *       The effective charge paid by the vehicle.
     *       The amount refunded to the vehicle.
     */
     function setRoutePrice(
             address entryBooth,
             address exitBooth,
             uint priceWeis)
         fromOwner
         public
         returns(bool success){
            require(entryBooth!=exitBooth,"Entry and exit booths are the same");
            require(entryBooth!=address(0) && exitBooth!=address(0),"Both addresses must be valid");
            require(isTollBooth(entryBooth)==true && isTollBooth(exitBooth)==true,"The booths are not registered");
            bytes32 routeHash = keccak256(abi.encode(entryBooth,exitBooth));
            require(routePrice[routeHash]!=priceWeis,"There is no change in price");
            routePrice[routeHash] = priceWeis;
            uint pending = getPendingPaymentCount(entryBooth,exitBooth);
            emit LogRoutePriceSet(
            msg.sender,
            entryBooth,
            exitBooth,
            priceWeis);
            if(pending>0){
                //clearSomePendingPayments(entryBooth,exitBooth,1);
                bytes32 hash = pendingPayments[keccak256(abi.encode(entryBooth,exitBooth))][0];
                uint multiplier = usedSecrets[hash].multiplier;
                uint depositedWei = usedSecrets[hash].depositedWeis;
                address vehicle = usedSecrets[hash].vehicle;
                usedSecrets[hash].depositedWeis = 0;
                usedSecrets[hash].multiplier = 0;
                usedSecrets[hash].vehicle = address(0);
                priceWeis = priceWeis.mul(multiplier);
                if(depositedWei>priceWeis){
                    uint amount = depositedWei.sub(priceWeis);
                    payments[vehicle] = payments[vehicle].add(amount);
                    payments[getOwner()] = payments[getOwner()].add(priceWeis);
                    emit LogRoadExited(
                    exitBooth,
                    hash,
                    priceWeis,
                    amount);
                }else{
                    payments[getOwner()] = payments[getOwner()].add(depositedWei);
                    emit LogRoadExited(
                    exitBooth,
                    hash,
                    depositedWei,
                    0);
                }
                for (pending = 0; pending<getPendingPaymentCount(entryBooth,exitBooth)-1; pending++){
                    pendingPayments[keccak256(abi.encode(entryBooth,exitBooth))][pending] = pendingPayments[keccak256(abi.encode(entryBooth,exitBooth))][pending+1];
                }
                pendingPayments[keccak256(abi.encode(entryBooth,exitBooth))].length--;
            }
            success = true;
         }
    /**
     * This function is commented out otherwise it prevents compilation of the completed contracts.
     * This function provides the same functionality with the eponymous function of `PullPaymentA`, which it
     * overrides, and to which it adds the following requirement:
     *     - It should roll back when the contract is in the `true` paused state.
     */
     function withdrawPayment()
         public
         whenNotPaused
         returns(bool success){
            uint payment = payments[msg.sender];
            require(payment != uint(0), "no payment available");
            payments[msg.sender] = uint(0);
            emit LogPaymentWithdrawn(msg.sender, payment);
            (success,) = msg.sender.call.value(payment)("");
            require(success, "payment transfer failed");
            return success;
         }
}