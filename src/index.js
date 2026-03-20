/** Current library revision string. */
export const REVISION = "0.2.0";

if (typeof globalThis !== "undefined") {
	if (globalThis.__EASEL__) {
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
} from "./animation/AnimationAction.js";
export { AnimationClip } from "./animation/AnimationClip.js";
export { AnimationUtils } from "./animation/AnimationUtils.js";
export { Animator } from "./animation/Animator.js";
export { Binding } from "./animation/Binding.js";
export { PropertyMixer } from "./animation/PropertyMixer.js";
export { Track } from "./animation/Track.js";
export { BooleanTrack } from "./animation/tracks/BooleanTrack.js";
export { ColorTrack } from "./animation/tracks/ColorTrack.js";
export { NumberTrack } from "./animation/tracks/NumberTrack.js";
export { QuaternionTrack } from "./animation/tracks/QuaternionTrack.js";
export { VectorTrack } from "./animation/tracks/VectorTrack.js";
// cameras
export { OrthographicCamera } from "./cameras/OrthographicCamera.js";
export { PerspectiveCamera } from "./cameras/PerspectiveCamera.js";
// controls
export { OrbitControls } from "./controls/OrbitControls.js";
export { Clock } from "./core/Clock.js";
export { Layer, LightType, Shading, Side, Wrapping } from "./core/Constants.js";
export { EventDispatcher } from "./core/EventDispatcher.js";
export { Layers } from "./core/Layers.js";
export { Node } from "./core/Node.js";
export { Raycaster } from "./core/Raycaster.js";
export { Scene } from "./core/Scene.js";
// curves
export { Curve } from "./curves/Curve.js";
export { CurvePath } from "./curves/CurvePath.js";
export { ArcCurve } from "./curves/curves/ArcCurve.js";
export { CatmullRomCurve3 } from "./curves/curves/CatmullRomCurve3.js";
export { CubicBezierCurve } from "./curves/curves/CubicBezierCurve.js";
export { CubicBezierCurve3 } from "./curves/curves/CubicBezierCurve3.js";
export { EllipseCurve } from "./curves/curves/EllipseCurve.js";
export { LineCurve } from "./curves/curves/LineCurve.js";
export { LineCurve3 } from "./curves/curves/LineCurve3.js";
export { QuadraticBezierCurve } from "./curves/curves/QuadraticBezierCurve.js";
export { QuadraticBezierCurve3 } from "./curves/curves/QuadraticBezierCurve3.js";
export { SplineCurve } from "./curves/curves/SplineCurve.js";
export { Path } from "./curves/Path.js";
export { Shape } from "./curves/Shape.js";
export { ShapePath } from "./curves/ShapePath.js";
// geometry
export { Attribute } from "./geometry/Attribute.js";
export { Geometry } from "./geometry/Geometry.js";
export { InterleavedAttribute } from "./geometry/InterleavedAttribute.js";
export { InterleavedBuffer } from "./geometry/InterleavedBuffer.js";
// geometry/primitives
export { BoxGeometry } from "./geometry/primitives/BoxGeometry.js";
export { CapsuleGeometry } from "./geometry/primitives/CapsuleGeometry.js";
export { ConeGeometry } from "./geometry/primitives/ConeGeometry.js";
export { CylinderGeometry } from "./geometry/primitives/CylinderGeometry.js";
export { DodecahedronGeometry } from "./geometry/primitives/DodecahedronGeometry.js";
export { EdgesGeometry } from "./geometry/primitives/EdgesGeometry.js";
export { ExtrudeGeometry } from "./geometry/primitives/ExtrudeGeometry.js";
export { IcosahedronGeometry } from "./geometry/primitives/IcosahedronGeometry.js";
export { LatheGeometry } from "./geometry/primitives/LatheGeometry.js";
export { OctahedronGeometry } from "./geometry/primitives/OctahedronGeometry.js";
export { PlaneGeometry } from "./geometry/primitives/PlaneGeometry.js";
export { PolyhedronGeometry } from "./geometry/primitives/PolyhedronGeometry.js";
export { RingGeometry } from "./geometry/primitives/RingGeometry.js";
export { ShapeGeometry } from "./geometry/primitives/ShapeGeometry.js";
export { SphereGeometry } from "./geometry/primitives/SphereGeometry.js";
export { TetrahedronGeometry } from "./geometry/primitives/TetrahedronGeometry.js";
export { TorusGeometry } from "./geometry/primitives/TorusGeometry.js";
export { TorusKnotGeometry } from "./geometry/primitives/TorusKnotGeometry.js";
export { TubeGeometry } from "./geometry/primitives/TubeGeometry.js";
export { WireframeGeometry } from "./geometry/primitives/WireframeGeometry.js";
// helpers
export { AxesHelper } from "./helpers/AxesHelper.js";
export { BoxHelper } from "./helpers/BoxHelper.js";
export { DirectionalLightHelper } from "./helpers/DirectionalLightHelper.js";
export { GridHelper } from "./helpers/GridHelper.js";
export { PointLightHelper } from "./helpers/PointLightHelper.js";
export { SpotLightHelper } from "./helpers/SpotLightHelper.js";
// lights
export { AmbientLight } from "./lights/AmbientLight.js";
export { DirectionalLight } from "./lights/DirectionalLight.js";
export { HemisphereLight } from "./lights/HemisphereLight.js";
export { Light } from "./lights/Light.js";
export { PointLight } from "./lights/PointLight.js";
export { SpotLight } from "./lights/SpotLight.js";
// loaders
export { AnimationLoader } from "./loaders/AnimationLoader.js";
export { DataTextureLoader } from "./loaders/DataTextureLoader.js";
export { FileLoader } from "./loaders/FileLoader.js";
export { GeometryLoader } from "./loaders/GeometryLoader.js";
export { ImageBitmapLoader } from "./loaders/ImageBitmapLoader.js";
export { ImageLoader } from "./loaders/ImageLoader.js";
export { Loader } from "./loaders/Loader.js";
export {
	DefaultLoadingManager,
	LoadingManager,
} from "./loaders/LoadingManager.js";
export { MaterialLoader } from "./loaders/MaterialLoader.js";
export { ObjectLoader } from "./loaders/ObjectLoader.js";
export { TextureLoader } from "./loaders/TextureLoader.js";
// materials
export { BasicMaterial } from "./materials/BasicMaterial.js";
export { DashedLineMaterial } from "./materials/DashedLineMaterial.js";
export { LambertMaterial } from "./materials/LambertMaterial.js";
export { LineMaterial } from "./materials/LineMaterial.js";
export { Material } from "./materials/Material.js";
export { PointsMaterial } from "./materials/PointsMaterial.js";
export { ToonMaterial } from "./materials/ToonMaterial.js";
// math
export { Box2 } from "./math/Box2.js";
export { Box3 } from "./math/Box3.js";
export { Color } from "./math/Color.js";
export { Cylindrical } from "./math/Cylindrical.js";
export { Euler } from "./math/Euler.js";
export { Frustum } from "./math/Frustum.js";
export { Line3 } from "./math/Line3.js";
export { MathUtils } from "./math/MathUtils.js";
export { Matrix3 } from "./math/Matrix3.js";
export { Matrix4 } from "./math/Matrix4.js";
export { Plane } from "./math/Plane.js";
export { Quaternion } from "./math/Quaternion.js";
export { Ray } from "./math/Ray.js";
export { Sphere } from "./math/Sphere.js";
export { Spherical } from "./math/Spherical.js";
export { Triangle } from "./math/Triangle.js";
export { Vector2 } from "./math/Vector2.js";
export { Vector3 } from "./math/Vector3.js";
export { Vector4 } from "./math/Vector4.js";
// objects
export { Bone } from "./objects/Bone.js";
export { Group } from "./objects/Group.js";
export { InstancedMesh } from "./objects/InstancedMesh.js";
export { Line } from "./objects/Line.js";
export { LineLoop } from "./objects/LineLoop.js";
export { LineSegments } from "./objects/LineSegments.js";
export { Mesh } from "./objects/Mesh.js";
export { Points } from "./objects/Points.js";
export { Skeleton } from "./objects/Skeleton.js";
export { SkinnedMesh } from "./objects/SkinnedMesh.js";
export { Sprite } from "./objects/Sprite.js";
export { ColorTable } from "./pipeline/color/ColorTable.js";
export { Hsl16 } from "./pipeline/color/Hsl16.js";
export { TranslucencyTable } from "./pipeline/color/TranslucencyTable.js";
export { DrawCall } from "./pipeline/DrawCall.js";
export { DrawList } from "./pipeline/DrawList.js";
export { FogCuller } from "./pipeline/FogCuller.js";
export { DepthBuffer } from "./pipeline/framebuffer/DepthBuffer.js";
export { Framebuffer } from "./pipeline/framebuffer/Framebuffer.js";
export { FramebufferClear } from "./pipeline/framebuffer/FramebufferClear.js";
export { FramebufferUpload } from "./pipeline/framebuffer/FramebufferUpload.js";
export { PainterSort } from "./pipeline/PainterSort.js";
export { PixelWriter } from "./pipeline/PixelWriter.js";
export { ViewToScreen } from "./pipeline/projection/ViewToScreen.js";
export { WorldToView } from "./pipeline/projection/WorldToView.js";
export { AffineUVSampler } from "./pipeline/rasterizer/AffineUVSampler.js";
export { EdgeWalker } from "./pipeline/rasterizer/EdgeWalker.js";
export { GouraudInterpolator } from "./pipeline/rasterizer/GouraudInterpolator.js";
export { PointRasterizer } from "./pipeline/rasterizer/PointRasterizer.js";
export { Rasterizer } from "./pipeline/rasterizer/Rasterizer.js";
export { ScanlineFill } from "./pipeline/rasterizer/ScanlineFill.js";
export { WireframeRasterizer } from "./pipeline/rasterizer/WireframeRasterizer.js";
export { SceneTraversal } from "./pipeline/SceneTraversal.js";
export { FlatShader } from "./pipeline/shading/FlatShader.js";
export { GouraudShader } from "./pipeline/shading/GouraudShader.js";
export { LightBaker } from "./pipeline/shading/LightBaker.js";
export { DrawPrioritySorter } from "./pipeline/sorting/DrawPrioritySorter.js";
export { PolygonSorter } from "./pipeline/sorting/PolygonSorter.js";
export { TileDistanceSorter } from "./pipeline/sorting/TileDistanceSorter.js";
export { TextureClamp } from "./pipeline/texture/TextureClamp.js";
export { TextureSampler } from "./pipeline/texture/TextureSampler.js";
// pipeline (advanced - typically consumed via Renderer)
export { Renderer } from "./renderers/Renderer.js";
// scenes
export { Fog } from "./scenes/Fog.js";
// textures
export { CanvasTexture } from "./textures/CanvasTexture.js";
export { DataTexture } from "./textures/DataTexture.js";
export { FramebufferTexture } from "./textures/FramebufferTexture.js";
export { Texture } from "./textures/Texture.js";
export { VideoTexture } from "./textures/VideoTexture.js";
