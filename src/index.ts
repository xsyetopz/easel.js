/** Current library revision string. */
export const REVISION = "0.6.1";

if (typeof globalThis !== "undefined") {
	if (globalThis.__EASEL__ && globalThis.__EASEL__ !== REVISION) {
		console.warn("WARNING: Multiple instances of Easel.js being imported.");
	} else {
		globalThis.__EASEL__ = REVISION;
	}
}

// animation
export {
	AnimationAction,
	LoopOnce,
	LoopPingPong,
	LoopRepeat,
} from "./animation/AnimationAction.ts";
export { AnimationClip } from "./animation/AnimationClip.ts";
export { AnimationUtils } from "./animation/AnimationUtils.ts";
export { Animator } from "./animation/Animator.ts";
export { Binding } from "./animation/Binding.ts";
export { PropertyMixer } from "./animation/PropertyMixer.ts";
export { Track } from "./animation/Track.ts";
export { BooleanTrack } from "./animation/tracks/BooleanTrack.ts";
export { ColorTrack } from "./animation/tracks/ColorTrack.ts";
export { NumberTrack } from "./animation/tracks/NumberTrack.ts";
export { QuaternionTrack } from "./animation/tracks/QuaternionTrack.ts";
export { VectorTrack } from "./animation/tracks/VectorTrack.ts";
// cameras
export { OrthographicCamera } from "./cameras/OrthographicCamera.ts";
export { PerspectiveCamera } from "./cameras/PerspectiveCamera.ts";
// controls
export { OrbitControls } from "./controls/OrbitControls.ts";
export { Clock } from "./core/Clock.ts";
export { Layer, LightType, Shading, Side, Wrapping } from "./core/Constants.ts";
export { EventDispatcher } from "./core/EventDispatcher.ts";
export { Layers } from "./core/Layers.ts";
export { Node } from "./core/Node.ts";
export { Raycaster } from "./core/Raycaster.ts";
export { Scene } from "./core/Scene.ts";
// curves
export { Curve } from "./curves/Curve.ts";
export { CurvePath } from "./curves/CurvePath.ts";
export { ArcCurve } from "./curves/curves/ArcCurve.ts";
export { CatmullRomCurve3 } from "./curves/curves/CatmullRomCurve3.ts";
export { CubicBezierCurve } from "./curves/curves/CubicBezierCurve.ts";
export { CubicBezierCurve3 } from "./curves/curves/CubicBezierCurve3.ts";
export { EllipseCurve } from "./curves/curves/EllipseCurve.ts";
export { LineCurve } from "./curves/curves/LineCurve.ts";
export { LineCurve3 } from "./curves/curves/LineCurve3.ts";
export { QuadraticBezierCurve } from "./curves/curves/QuadraticBezierCurve.ts";
export { QuadraticBezierCurve3 } from "./curves/curves/QuadraticBezierCurve3.ts";
export { SplineCurve } from "./curves/curves/SplineCurve.ts";
export { Path } from "./curves/Path.ts";
export { Shape } from "./curves/Shape.ts";
export { ShapePath } from "./curves/ShapePath.ts";
// geometry
export { Attribute } from "./geometry/Attribute.ts";
export { Geometry } from "./geometry/Geometry.ts";
export { InterleavedAttribute } from "./geometry/InterleavedAttribute.ts";
export { InterleavedBuffer } from "./geometry/InterleavedBuffer.ts";
// geometry/primitives
export { BoxGeometry } from "./geometry/primitives/BoxGeometry.ts";
export { CapsuleGeometry } from "./geometry/primitives/CapsuleGeometry.ts";
export { ConeGeometry } from "./geometry/primitives/ConeGeometry.ts";
export { CylinderGeometry } from "./geometry/primitives/CylinderGeometry.ts";
export { DodecahedronGeometry } from "./geometry/primitives/DodecahedronGeometry.ts";
export { EdgesGeometry } from "./geometry/primitives/EdgesGeometry.ts";
export { ExtrudeGeometry } from "./geometry/primitives/ExtrudeGeometry.ts";
export { IcosahedronGeometry } from "./geometry/primitives/IcosahedronGeometry.ts";
export { LatheGeometry } from "./geometry/primitives/LatheGeometry.ts";
export { OctahedronGeometry } from "./geometry/primitives/OctahedronGeometry.ts";
export { PlaneGeometry } from "./geometry/primitives/PlaneGeometry.ts";
export { PolyhedronGeometry } from "./geometry/primitives/PolyhedronGeometry.ts";
export { RingGeometry } from "./geometry/primitives/RingGeometry.ts";
export { ShapeGeometry } from "./geometry/primitives/ShapeGeometry.ts";
export { SphereGeometry } from "./geometry/primitives/SphereGeometry.ts";
export { TetrahedronGeometry } from "./geometry/primitives/TetrahedronGeometry.ts";
export { TorusGeometry } from "./geometry/primitives/TorusGeometry.ts";
export { TorusKnotGeometry } from "./geometry/primitives/TorusKnotGeometry.ts";
export { TubeGeometry } from "./geometry/primitives/TubeGeometry.ts";
export { WireframeGeometry } from "./geometry/primitives/WireframeGeometry.ts";
// helpers
export { AxesHelper } from "./helpers/AxesHelper.ts";
export { BoxHelper } from "./helpers/BoxHelper.ts";
export { DirectionalLightHelper } from "./helpers/DirectionalLightHelper.ts";
export { GridHelper } from "./helpers/GridHelper.ts";
export { PointLightHelper } from "./helpers/PointLightHelper.ts";
export { SpotLightHelper } from "./helpers/SpotLightHelper.ts";
// lights
export { AmbientLight } from "./lights/AmbientLight.ts";
export { DirectionalLight } from "./lights/DirectionalLight.ts";
export { HemisphereLight } from "./lights/HemisphereLight.ts";
export { Light } from "./lights/Light.ts";
export { PointLight } from "./lights/PointLight.ts";
export { SpotLight } from "./lights/SpotLight.ts";
// loaders
export { AnimationLoader } from "./loaders/AnimationLoader.ts";
export { DataTextureLoader } from "./loaders/DataTextureLoader.ts";
export { FileLoader } from "./loaders/FileLoader.ts";
export { GeometryLoader } from "./loaders/GeometryLoader.ts";
export { ImageBitmapLoader } from "./loaders/ImageBitmapLoader.ts";
export { ImageLoader } from "./loaders/ImageLoader.ts";
export { Loader } from "./loaders/Loader.ts";
export {
	DefaultLoadingManager,
	LoadingManager,
} from "./loaders/LoadingManager.ts";
export { MaterialLoader } from "./loaders/MaterialLoader.ts";
export { ObjectLoader } from "./loaders/ObjectLoader.ts";
export { TextureLoader } from "./loaders/TextureLoader.ts";
// materials
export { BasicMaterial } from "./materials/BasicMaterial.ts";
export { DashedLineMaterial } from "./materials/DashedLineMaterial.ts";
export { LambertMaterial } from "./materials/LambertMaterial.ts";
export { LineMaterial } from "./materials/LineMaterial.ts";
export { Material } from "./materials/Material.ts";
export { PointsMaterial } from "./materials/PointsMaterial.ts";
export { ToonMaterial } from "./materials/ToonMaterial.ts";
export { Box2 } from "./math/Box2.ts";
export { Box3 } from "./math/Box3.ts";
export { Color } from "./math/Color.ts";
export { Cylindrical } from "./math/Cylindrical.ts";
// math
export { earcut } from "./math/Earcut.ts";
export { Euler } from "./math/Euler.ts";
export { Frustum } from "./math/Frustum.ts";
export { Line3 } from "./math/Line3.ts";
export { MathUtils } from "./math/MathUtils.ts";
export { Matrix3 } from "./math/Matrix3.ts";
export { Matrix4 } from "./math/Matrix4.ts";
export { Plane } from "./math/Plane.ts";
export { Quaternion } from "./math/Quaternion.ts";
export { Ray } from "./math/Ray.ts";
export { Sphere } from "./math/Sphere.ts";
export { Spherical } from "./math/Spherical.ts";
export { Triangle } from "./math/Triangle.ts";
export { Vector2 } from "./math/Vector2.ts";
export { Vector3 } from "./math/Vector3.ts";
export { Vector4 } from "./math/Vector4.ts";
// objects
export { Bone } from "./objects/Bone.ts";
export { Group } from "./objects/Group.ts";
export { InstancedMesh } from "./objects/InstancedMesh.ts";
export { Line } from "./objects/Line.ts";
export { LineLoop } from "./objects/LineLoop.ts";
export { LineSegments } from "./objects/LineSegments.ts";
export { Mesh } from "./objects/Mesh.ts";
export { Points } from "./objects/Points.ts";
export { Skeleton } from "./objects/Skeleton.ts";
export { SkinnedMesh } from "./objects/SkinnedMesh.ts";
export { Sprite } from "./objects/Sprite.ts";
export { ColorTable } from "./pipeline/color/ColorTable.ts";
export { Hsl16 } from "./pipeline/color/Hsl16.ts";
export { TranslucencyTable } from "./pipeline/color/TranslucencyTable.ts";
export { DrawCall } from "./pipeline/DrawCall.ts";
export { DrawList } from "./pipeline/DrawList.ts";
export { FogCuller } from "./pipeline/FogCuller.ts";
export { DepthBuffer } from "./pipeline/framebuffer/DepthBuffer.ts";
export { Framebuffer } from "./pipeline/framebuffer/Framebuffer.ts";
export { FramebufferClear } from "./pipeline/framebuffer/FramebufferClear.ts";
export { FramebufferUpload } from "./pipeline/framebuffer/FramebufferUpload.ts";
export { PainterSort } from "./pipeline/PainterSort.ts";
export { PixelWriter } from "./pipeline/PixelWriter.ts";
export { ViewToScreen } from "./pipeline/projection/ViewToScreen.ts";
export { WorldToView } from "./pipeline/projection/WorldToView.ts";
export { AffineUVSampler } from "./pipeline/rasterizer/AffineUVSampler.ts";
export { EdgeWalker } from "./pipeline/rasterizer/EdgeWalker.ts";
export { GouraudInterpolator } from "./pipeline/rasterizer/GouraudInterpolator.ts";
export { PointRasterizer } from "./pipeline/rasterizer/PointRasterizer.ts";
export { Rasterizer } from "./pipeline/rasterizer/Rasterizer.ts";
export { ScanlineFill } from "./pipeline/rasterizer/ScanlineFill.ts";
export { WireframeRasterizer } from "./pipeline/rasterizer/WireframeRasterizer.ts";
export { SceneTraversal } from "./pipeline/SceneTraversal.ts";
export { FlatShader } from "./pipeline/shading/FlatShader.ts";
export { GouraudShader } from "./pipeline/shading/GouraudShader.ts";
export { LightBaker } from "./pipeline/shading/LightBaker.ts";
export { DrawPrioritySorter } from "./pipeline/sorting/DrawPrioritySorter.ts";
export { PolygonSorter } from "./pipeline/sorting/PolygonSorter.ts";
export { TileDistanceSorter } from "./pipeline/sorting/TileDistanceSorter.ts";
export { TextureClamp } from "./pipeline/texture/TextureClamp.ts";
export { TextureSampler } from "./pipeline/texture/TextureSampler.ts";
// pipeline (advanced - typically consumed via Renderer)
export { Renderer } from "./renderers/Renderer.ts";
// scenes
export { Fog } from "./scenes/Fog.ts";
// textures
export { CanvasTexture } from "./textures/CanvasTexture.ts";
export { DataTexture } from "./textures/DataTexture.ts";
export { FramebufferTexture } from "./textures/FramebufferTexture.ts";
export { Texture } from "./textures/Texture.ts";
export { VideoTexture } from "./textures/VideoTexture.ts";
