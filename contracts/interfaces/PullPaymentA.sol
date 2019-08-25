pragma solidity ^0.5.0;

contract PullPaymentA {

    /**
     * Event emitted when the payment recorded here has been withdrawn.
     * @param toWhom The account that ran the action.
     * @param amount The value of the payment withdrawn measured in weis.
     */
    event LogPaymentWithdrawn(address indexed toWhom, uint amount);

    /**
     * Called by a child contract to pay an address by way of withdraw pattern.
     * @param whom The account that is to receive the amount.
     * @param amount The amount that is to be received.
     */
    function asyncPayTo(address whom, uint amount) internal;

    /**
     * Called by anyone that is owed a payment.
     *     It should roll back if the caller has 0 to withdraw.
     *     It should use the `.call.value` syntax and not limit the gas passed.
     *     Tests will use GreedyRecipient.sol to make sure a lot of gas is passed.
     * @return Whether the action was successful.
     * Emits LogPaymentWithdrawn with:
     *     The sender of the action, to which the payment is sent.
     *     The amount that was withdrawn.
     */
    function withdrawPayment()
        public
        returns(bool success);

    /**
     * @param whose The account that is owed a payment.
     * @return The payment owed to the address parameter.
     */
    function getPayment(address whose)
        view
        public
        returns(uint weis);

    /*
     * You need to create:
     *
     * - a contract named `PullPayment` that:
     *     - is `PullPaymentA`.
     *     - has a constructor that takes no parameter, or you omit it.
     */        
}