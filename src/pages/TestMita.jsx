import Mita3D from "../components/Mita3D";

export default function HomePage() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      
      <div className="absolute inset-0">
        <Mita3D />
      </div>

      <div className="relative z-10 text-white">
        <h1 className="text-4xl">ScrapHub</h1>
      </div>

    </div>
  );
}