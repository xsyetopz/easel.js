# API exports

Generated from `@xsyetopz/easel@0.6.1` `dist/index.d.ts`.

## Contents

- [animation](#animation)
- [cameras](#cameras)
- [controls](#controls)
- [core](#core)
- [curves](#curves)
- [geometry](#geometry)
- [helpers](#helpers)
- [lights](#lights)
- [loaders](#loaders)
- [materials](#materials)
- [math](#math)
- [objects](#objects)
- [pipeline](#pipeline)
- [renderers](#renderers)
- [root](#root)
- [scenes](#scenes)
- [textures](#textures)

## animation

- `AnimationAction` -- `./animation/AnimationAction.ts`
- `AnimationClip` -- `./animation/AnimationClip.ts`
- `AnimationUtils` -- `./animation/AnimationUtils.ts`
- `Animator` -- `./animation/Animator.ts`
- `Binding` -- `./animation/Binding.ts`
- `BooleanTrack` -- `./animation/tracks/BooleanTrack.ts`
- `ColorTrack` -- `./animation/tracks/ColorTrack.ts`
- `LoopOnce` -- `./animation/AnimationAction.ts`
- `LoopPingPong` -- `./animation/AnimationAction.ts`
- `LoopRepeat` -- `./animation/AnimationAction.ts`
- `NumberTrack` -- `./animation/tracks/NumberTrack.ts`
- `PropertyMixer` -- `./animation/PropertyMixer.ts`
- `QuaternionTrack` -- `./animation/tracks/QuaternionTrack.ts`
- `Track` -- `./animation/Track.ts`
- `VectorTrack` -- `./animation/tracks/VectorTrack.ts`

## cameras

- `OrthographicCamera` -- `./cameras/OrthographicCamera.ts`
- `PerspectiveCamera` -- `./cameras/PerspectiveCamera.ts`

## controls

- `OrbitControls` -- `./controls/OrbitControls.ts`

## core

- `Clock` -- `./core/Clock.ts`
- `EventDispatcher` -- `./core/EventDispatcher.ts`
- `Layer` -- `./core/Constants.ts`
- `Layers` -- `./core/Layers.ts`
- `LightType` -- `./core/Constants.ts`
- `Node` -- `./core/Node.ts`
- `Raycaster` -- `./core/Raycaster.ts`
- `Scene` -- `./core/Scene.ts`
- `Shading` -- `./core/Constants.ts`
- `Side` -- `./core/Constants.ts`
- `Wrapping` -- `./core/Constants.ts`

## curves

- `ArcCurve` -- `./curves/curves/ArcCurve.ts`
- `CatmullRomCurve3` -- `./curves/curves/CatmullRomCurve3.ts`
- `CubicBezierCurve` -- `./curves/curves/CubicBezierCurve.ts`
- `CubicBezierCurve3` -- `./curves/curves/CubicBezierCurve3.ts`
- `Curve` -- `./curves/Curve.ts`
- `CurvePath` -- `./curves/CurvePath.ts`
- `EllipseCurve` -- `./curves/curves/EllipseCurve.ts`
- `LineCurve` -- `./curves/curves/LineCurve.ts`
- `LineCurve3` -- `./curves/curves/LineCurve3.ts`
- `Path` -- `./curves/Path.ts`
- `QuadraticBezierCurve` -- `./curves/curves/QuadraticBezierCurve.ts`
- `QuadraticBezierCurve3` -- `./curves/curves/QuadraticBezierCurve3.ts`
- `Shape` -- `./curves/Shape.ts`
- `ShapePath` -- `./curves/ShapePath.ts`
- `SplineCurve` -- `./curves/curves/SplineCurve.ts`

## geometry

- `Attribute` -- `./geometry/Attribute.ts`
- `BoxGeometry` -- `./geometry/primitives/BoxGeometry.ts`
- `CapsuleGeometry` -- `./geometry/primitives/CapsuleGeometry.ts`
- `ConeGeometry` -- `./geometry/primitives/ConeGeometry.ts`
- `CylinderGeometry` -- `./geometry/primitives/CylinderGeometry.ts`
- `DodecahedronGeometry` -- `./geometry/primitives/DodecahedronGeometry.ts`
- `EdgesGeometry` -- `./geometry/primitives/EdgesGeometry.ts`
- `ExtrudeGeometry` -- `./geometry/primitives/ExtrudeGeometry.ts`
- `Geometry` -- `./geometry/Geometry.ts`
- `IcosahedronGeometry` -- `./geometry/primitives/IcosahedronGeometry.ts`
- `InterleavedAttribute` -- `./geometry/InterleavedAttribute.ts`
- `InterleavedBuffer` -- `./geometry/InterleavedBuffer.ts`
- `LatheGeometry` -- `./geometry/primitives/LatheGeometry.ts`
- `OctahedronGeometry` -- `./geometry/primitives/OctahedronGeometry.ts`
- `PlaneGeometry` -- `./geometry/primitives/PlaneGeometry.ts`
- `PolyhedronGeometry` -- `./geometry/primitives/PolyhedronGeometry.ts`
- `RingGeometry` -- `./geometry/primitives/RingGeometry.ts`
- `ShapeGeometry` -- `./geometry/primitives/ShapeGeometry.ts`
- `SphereGeometry` -- `./geometry/primitives/SphereGeometry.ts`
- `TetrahedronGeometry` -- `./geometry/primitives/TetrahedronGeometry.ts`
- `TorusGeometry` -- `./geometry/primitives/TorusGeometry.ts`
- `TorusKnotGeometry` -- `./geometry/primitives/TorusKnotGeometry.ts`
- `TubeGeometry` -- `./geometry/primitives/TubeGeometry.ts`
- `WireframeGeometry` -- `./geometry/primitives/WireframeGeometry.ts`

## helpers

- `AxesHelper` -- `./helpers/AxesHelper.ts`
- `BoxHelper` -- `./helpers/BoxHelper.ts`
- `DirectionalLightHelper` -- `./helpers/DirectionalLightHelper.ts`
- `GridHelper` -- `./helpers/GridHelper.ts`
- `PointLightHelper` -- `./helpers/PointLightHelper.ts`
- `SpotLightHelper` -- `./helpers/SpotLightHelper.ts`

## lights

- `AmbientLight` -- `./lights/AmbientLight.ts`
- `DirectionalLight` -- `./lights/DirectionalLight.ts`
- `HemisphereLight` -- `./lights/HemisphereLight.ts`
- `Light` -- `./lights/Light.ts`
- `PointLight` -- `./lights/PointLight.ts`
- `SpotLight` -- `./lights/SpotLight.ts`

## loaders

- `AnimationLoader` -- `./loaders/AnimationLoader.ts`
- `DataTextureLoader` -- `./loaders/DataTextureLoader.ts`
- `DefaultLoadingManager` -- `./loaders/LoadingManager.ts`
- `FileLoader` -- `./loaders/FileLoader.ts`
- `GeometryLoader` -- `./loaders/GeometryLoader.ts`
- `ImageBitmapLoader` -- `./loaders/ImageBitmapLoader.ts`
- `ImageLoader` -- `./loaders/ImageLoader.ts`
- `Loader` -- `./loaders/Loader.ts`
- `LoadingManager` -- `./loaders/LoadingManager.ts`
- `MaterialLoader` -- `./loaders/MaterialLoader.ts`
- `ObjectLoader` -- `./loaders/ObjectLoader.ts`
- `TextureLoader` -- `./loaders/TextureLoader.ts`

## materials

- `BasicMaterial` -- `./materials/BasicMaterial.ts`
- `DashedLineMaterial` -- `./materials/DashedLineMaterial.ts`
- `LambertMaterial` -- `./materials/LambertMaterial.ts`
- `LineMaterial` -- `./materials/LineMaterial.ts`
- `Material` -- `./materials/Material.ts`
- `PointsMaterial` -- `./materials/PointsMaterial.ts`
- `ToonMaterial` -- `./materials/ToonMaterial.ts`

## math

- `Box2` -- `./math/Box2.ts`
- `Box3` -- `./math/Box3.ts`
- `Color` -- `./math/Color.ts`
- `Cylindrical` -- `./math/Cylindrical.ts`
- `earcut` -- `./math/Earcut.ts`
- `Euler` -- `./math/Euler.ts`
- `Frustum` -- `./math/Frustum.ts`
- `Line3` -- `./math/Line3.ts`
- `MathUtils` -- `./math/MathUtils.ts`
- `Matrix3` -- `./math/Matrix3.ts`
- `Matrix4` -- `./math/Matrix4.ts`
- `Plane` -- `./math/Plane.ts`
- `Quaternion` -- `./math/Quaternion.ts`
- `Ray` -- `./math/Ray.ts`
- `Sphere` -- `./math/Sphere.ts`
- `Spherical` -- `./math/Spherical.ts`
- `Triangle` -- `./math/Triangle.ts`
- `Vector2` -- `./math/Vector2.ts`
- `Vector3` -- `./math/Vector3.ts`
- `Vector4` -- `./math/Vector4.ts`

## objects

- `Bone` -- `./objects/Bone.ts`
- `Group` -- `./objects/Group.ts`
- `InstancedMesh` -- `./objects/InstancedMesh.ts`
- `Line` -- `./objects/Line.ts`
- `LineLoop` -- `./objects/LineLoop.ts`
- `LineSegments` -- `./objects/LineSegments.ts`
- `Mesh` -- `./objects/Mesh.ts`
- `Points` -- `./objects/Points.ts`
- `Skeleton` -- `./objects/Skeleton.ts`
- `SkinnedMesh` -- `./objects/SkinnedMesh.ts`
- `Sprite` -- `./objects/Sprite.ts`

## pipeline

- `AffineUVSampler` -- `./pipeline/rasterizer/AffineUVSampler.ts`
- `ColorTable` -- `./pipeline/color/ColorTable.ts`
- `DepthBuffer` -- `./pipeline/framebuffer/DepthBuffer.ts`
- `DrawCall` -- `./pipeline/DrawCall.ts`
- `DrawList` -- `./pipeline/DrawList.ts`
- `DrawPrioritySorter` -- `./pipeline/sorting/DrawPrioritySorter.ts`
- `EdgeWalker` -- `./pipeline/rasterizer/EdgeWalker.ts`
- `FlatShader` -- `./pipeline/shading/FlatShader.ts`
- `FogCuller` -- `./pipeline/FogCuller.ts`
- `Framebuffer` -- `./pipeline/framebuffer/Framebuffer.ts`
- `FramebufferClear` -- `./pipeline/framebuffer/FramebufferClear.ts`
- `FramebufferUpload` -- `./pipeline/framebuffer/FramebufferUpload.ts`
- `GouraudInterpolator` -- `./pipeline/rasterizer/GouraudInterpolator.ts`
- `GouraudShader` -- `./pipeline/shading/GouraudShader.ts`
- `Hsl16` -- `./pipeline/color/Hsl16.ts`
- `LightBaker` -- `./pipeline/shading/LightBaker.ts`
- `PainterSort` -- `./pipeline/PainterSort.ts`
- `PixelWriter` -- `./pipeline/PixelWriter.ts`
- `PointRasterizer` -- `./pipeline/rasterizer/PointRasterizer.ts`
- `PolygonSorter` -- `./pipeline/sorting/PolygonSorter.ts`
- `Rasterizer` -- `./pipeline/rasterizer/Rasterizer.ts`
- `ScanlineFill` -- `./pipeline/rasterizer/ScanlineFill.ts`
- `SceneTraversal` -- `./pipeline/SceneTraversal.ts`
- `TextureClamp` -- `./pipeline/texture/TextureClamp.ts`
- `TextureSampler` -- `./pipeline/texture/TextureSampler.ts`
- `TileDistanceSorter` -- `./pipeline/sorting/TileDistanceSorter.ts`
- `TranslucencyTable` -- `./pipeline/color/TranslucencyTable.ts`
- `ViewToScreen` -- `./pipeline/projection/ViewToScreen.ts`
- `WireframeRasterizer` -- `./pipeline/rasterizer/WireframeRasterizer.ts`
- `WorldToView` -- `./pipeline/projection/WorldToView.ts`

## renderers

- `Renderer` -- `./renderers/Renderer.ts`

## root

- `REVISION` -- `literal 0.6.1`

## scenes

- `Fog` -- `./scenes/Fog.ts`

## textures

- `CanvasTexture` -- `./textures/CanvasTexture.ts`
- `DataTexture` -- `./textures/DataTexture.ts`
- `FramebufferTexture` -- `./textures/FramebufferTexture.ts`
- `Texture` -- `./textures/Texture.ts`
- `VideoTexture` -- `./textures/VideoTexture.ts`
