// Service task using Runnable
class RoomServiceTask implements Runnable {
    private String serviceName;

    RoomServiceTask(String serviceName) {
        this.serviceName = serviceName;
    }

    @Override
    public void run() {
        for (int i = 1; i <= 3; i++) {
            System.out.println(serviceName + " in progress... Step " + i);
            try {
                Thread.sleep(500); // simulate processing time
            } catch (InterruptedException e) {
                System.out.println(serviceName + " interrupted");
            }
        }
        System.out.println(serviceName + " completed.");
    }
}

// Main program
public class HotelRoomServiceSystem {
    public static void main(String[] args) {

        Thread cleaning = new Thread(new RoomServiceTask("Room Cleaning"));
        Thread food = new Thread(new RoomServiceTask("Food Delivery"));
        Thread maintenance = new Thread(new RoomServiceTask("Maintenance Service"));

        // Start services concurrently
        cleaning.start();
        food.start();
        maintenance.start();
    }
}
