# Three system

`Experience` is the only client boundary that can load Three. Initial server output includes the full image, title, link and information. Desktop fine-pointer at >=48rem, no reduced motion, no save-data and WebGL2 support are necessary before dynamic import.

`ExperienceCanvas` owns a single transparent R3F canvas. `CityScene` defines 21 low-poly meshes (12 side ribs and three 3-part portal frames) and two lights. No shadow maps, effects, remote textures or models. `CameraRig` listens only on the hero and damps the camera toward a small clamped pointer offset using capped delta time. Native DOM scrolling drives the transition; no WebGL content is required below the hero.

HIGH/MEDIUM/LOW DPR are 1.5/1.25/1. Runtime bounds are 28/55 FPS, sampled by Drei PerformanceMonitor. Three consecutive low samples trigger STATIC; a good sample clears the low count. Importantly, upward samples must never trigger static fallback. Monitor default flipflop fallback is not used because it counts repeated upward samples too. Hidden/offscreen canvas sets `frameloop='never'`. Pause removes the canvas; resume creates one fresh instance.

Cleanup: event listeners and IntersectionObserver disconnect in effects; camera listeners are removed; R3F disposes declarative geometries/materials and renderer on unmount. Context loss and React render errors remove the enhancement for the current mount and retain the image. No scene resource is shared globally. Production route changes unmount the complete hero island. Mobile never mounts the canvas, rather than hiding an active renderer with CSS.

Future managers (asset caching, multiple scenes, route transitions, GLTF/postprocessing) should be added only when a real scene requires them. Do not create empty infrastructure classes for the prototype.
