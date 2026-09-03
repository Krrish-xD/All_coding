import Hero from '../components/home/Hero';
import About from '../components/home/About';
import Stats from '../components/home/Stats';
import WhyUs from '../components/home/WhyUs';
import FeaturedProducts from '../components/home/FeaturedProducts';
import OrderTimeline from '../components/home/OrderTimeline';

const HomePage = () => {
  return (
    <>
      <Hero />
      <About />
      <FeaturedProducts />
      <Stats />
      <WhyUs />
      <OrderTimeline />
    </>
  );
};

export default HomePage;
