import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export default function Mita3D() {
  const ref = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();

    
    
    
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );

    
    camera.position.set(0, 1.5, 3.5);
    camera.lookAt(0, 1.3, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: ref.current,
      alpha: true,
      antialias: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    
    scene.add(new THREE.AmbientLight(0xffffff, 2));

    const dir = new THREE.DirectionalLight(0xffffff, 2);
    dir.position.set(2, 5, 3);
    scene.add(dir);

    let model;
    let mixer;

    let head;

    const clock = new THREE.Clock();

    const mouse = new THREE.Vector2();
    const smooth = new THREE.Vector2();

    
    
    
    window.addEventListener("mousemove", (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    });

    const loader = new GLTFLoader();

    loader.load("/3DMita/mita.glb", (gltf) => {
      model = gltf.scene;
      scene.add(model);

      
      
      
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      model.position.sub(center);

      const scale = 2 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);

      
      model.position.y += size.y * 0.15;

      
      
      
      model.traverse((obj) => {
        const n = obj.name.toLowerCase();

        if (obj.isBone && n.includes("head")) {
          head = obj;

          
          obj.rotation.order = "YXZ";
        }

        if (obj.isMesh) {
          const mat = obj.material;
          if (mat?.map) mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.side = THREE.DoubleSide;
        }
      });

      
      
      
      mixer = new THREE.AnimationMixer(model);

      const anim =
        gltf.animations.find((a) =>
          a.name.toLowerCase().includes("idle")
        ) || gltf.animations[0];

      if (anim) mixer.clipAction(anim).play();
    });

    
    
    
    const animate = () => {
      requestAnimationFrame(animate);

      const dt = clock.getDelta();

      if (mixer) mixer.update(dt);

      
      
      
      smooth.x += (mouse.x - smooth.x) * 0.06;
      smooth.y += (mouse.y - smooth.y) * 0.06;

      
      
      
      if (head) {
        const targetY = smooth.x * 3.0;
        const targetX = smooth.y * -1.6;

        
        head.rotation.y += (targetY - head.rotation.y) * 0.15;
        head.rotation.x += (targetX - head.rotation.x) * 0.15;
      }

      renderer.render(scene, camera);
    };

    animate();

    
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }, []);

  return <canvas ref={ref} className="w-screen h-screen block" />;
}