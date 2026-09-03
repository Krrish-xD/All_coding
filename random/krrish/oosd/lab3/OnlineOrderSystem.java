// Order processing thread
class OrderProcessingThread extends Thread {
    private String orderId;

    OrderProcessingThread(String orderId) {
        this.orderId = orderId;
    }

    @Override
    public void run() {
        System.out.println(orderId + ": Validating order...");
        // Thread.sleep(500);

        System.out.println(orderId + ": Processing payment...");
        // Thread.sleep(500);

        System.out.println(orderId + ": Shipping order...");
        // Thread.sleep(500);

        System.out.println(orderId + ": Order completed.");

    }
}

// Main program
public class OnlineOrderSystem {
    public static void main(String[] args) {

        OrderProcessingThread o1 = new OrderProcessingThread("Order-101");
        OrderProcessingThread o2 = new OrderProcessingThread("Order-102");
        OrderProcessingThread o3 = new OrderProcessingThread("Order-103");

        // Process orders concurrently
        o1.start();
        o2.start();
        o3.start();
    }
}
