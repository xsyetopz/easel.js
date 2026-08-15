/** Current library revision string. */
export const REVISION: string = "0.7.0";

if (typeof globalThis !== "undefined") {
  if (globalThis.__EASEL__ && globalThis.__EASEL__ !== REVISION) {
    console.warn("WARNING: Multiple instances of EASEL.js being imported.");
  } else {
    globalThis.__EASEL__ = REVISION;
  }
}

// animation
export {
  AnimationAction,
  Loop,
  type LoopMode,
} from "./animation/AnimationAction.ts";
export {
  AnimationBlend,
  type AnimationBlendMode,
  AnimationClip,
  type AnimationClipJSON,
  type AnimationClipTrackJSON,
  animationClipFromJson,
  animationClipToJSON,
  findAnimationClip,
  findByName,
  parse,
  CreateFromMorphTargetSequence,
  CreateClipsFromMorphTargetSequences,
} from "./animation/AnimationClip.ts";
export { AnimationGroup } from "./animation/AnimationGroup.ts";
export {
  convertArray,
  type FlatKeyframe,
  flattenJSON,
  getKeyframeOrder,
  isTypedArray,
  makeClipAdditive,
  type NumericTypedArray,
  type NumericTypedArrayConstructor,
  sortedArray,
  subclip,
} from "./animation/AnimationUtils.ts";
export { Animator } from "./animation/Animator.ts";
export {
  Binding,
  type BindingPath,
  findBindingNode,
  findNode,
  parseBindingPath,
  parseTrackName,
  sanitizeBindingNodeName,
} from "./animation/Binding.ts";
export { PropertyMixer } from "./animation/PropertyMixer.ts";
export {
  type AnimationTrack,
  Interpolation,
  InterpolationEnding,
  type InterpolationEndingMode,
  type InterpolationMode,
  Track,
  type TrackOptions,
  type TrackValue,
  type TrackValueType,
} from "./animation/Track.ts";
export { Interpolant } from "./animation/interpolants/Interpolant.ts";
export { LinearInterpolant } from "./animation/interpolants/LinearInterpolant.ts";
export { DiscreteInterpolant } from "./animation/interpolants/DiscreteInterpolant.ts";
export { CubicInterpolant } from "./animation/interpolants/CubicInterpolant.ts";
export { BezierInterpolant } from "./animation/interpolants/BezierInterpolant.ts";
export { QuaternionLinearInterpolant } from "./animation/interpolants/QuaternionLinearInterpolant.ts";
export { BooleanTrack } from "./animation/tracks/BooleanTrack.ts";
export { ColorTrack } from "./animation/tracks/ColorTrack.ts";
export { NumberTrack } from "./animation/tracks/NumberTrack.ts";
export { QuaternionTrack } from "./animation/tracks/QuaternionTrack.ts";
export { StringTrack } from "./animation/tracks/StringTrack.ts";
export { VectorTrack } from "./animation/tracks/VectorTrack.ts";
// audio
export {
  AudioAnalyzer,
  type AudioAnalyzerOptions,
} from "./audio/AudioAnalyzer.ts";
export {
  type CanvasAudioContext,
  type AudioVisualizerOptions,
  drawAudioAnalyzer,
  drawFrequencyBars,
  drawTimeDomainWaveform,
} from "./audio/AudioVisualizer.ts";
export { Audio, type AudioSourceType } from "./audio/Audio.ts";
export {
  getAudioContext,
  setAudioContext,
} from "./audio/AudioContext.ts";
export { AudioListener } from "./audio/AudioListener.ts";
export { PositionalAudio } from "./audio/PositionalAudio.ts";
export {
  AudioGraph,
  type AudioGraphOptions,
  createBrowserAudioContext,
} from "./audio/AudioGraph.ts";
export type {
  AnalyserNodeLike,
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  NativeAudioListenerLike,
  OscillatorNodeLike,
  PannerNodeLike,
  StereoPannerNodeLike,
} from "./audio/AudioTypes.ts";
export {
  assertCameraViewOffset,
  Camera,
  type CameraJSON,
  type CameraOptions,
  type CameraView,
  makeCameraView,
} from "./cameras/Camera.ts";
// cameras
export {
  OrthographicCamera,
  type OrthographicCameraJSON,
  type OrthographicCameraOptions,
} from "./cameras/OrthographicCamera.ts";
export {
  ArrayCamera,
  type ArrayCameraOptions,
} from "./cameras/ArrayCamera.ts";
export {
  PerspectiveCamera,
  type PerspectiveCameraJSON,
  type PerspectiveCameraOptions,
} from "./cameras/PerspectiveCamera.ts";
export { StereoCamera } from "./cameras/StereoCamera.ts";
export {
  type ArcballCamera,
  ArcballControls,
  type MouseAction,
} from "./controls/ArcballControls.ts";
export {
  DragControls,
  type DragControlsEvent,
} from "./controls/DragControls.ts";
export { Controls } from "./controls/Controls.ts";
export { FirstPersonControls } from "./controls/FirstPersonControls.ts";
export { FlyControls } from "./controls/FlyControls.ts";
export { MapControls } from "./controls/MapControls.ts";
// controls
export { OrbitControls } from "./controls/OrbitControls.ts";
export { PointerLockControls } from "./controls/PointerLockControls.ts";
export { TrackballControls } from "./controls/TrackballControls.ts";
export {
  type TransformAxis,
  TransformControls,
  type TransformMode,
  type TransformPointer,
  type TransformSpace,
  type TransformViewport,
} from "./controls/TransformControls.ts";
export {
  BindMode,
  ColorManagement,
  Compatibility,
  InterpolationSamplingMode,
  InterpolationSamplingType,
  Layer,
  LightType,
  LinearTransfer,
  MOUSE,
  NoNormalPacking,
  NormalGAPacking,
  NormalRGPacking,
  Shading,
  Side,
  SRGBTransfer,
  TOUCH,
  TriangleFanDrawMode,
  TriangleStripDrawMode,
  TrianglesDrawMode,
  Wrapping,
} from "./core/Constants.ts";
export { EventDispatcher } from "./core/EventDispatcher.ts";
export { Layers } from "./core/Layers.ts";
export {
  DEFAULT_UP,
  DEFAULT_MATRIX_AUTO_UPDATE,
  DEFAULT_MATRIX_WORLD_AUTO_UPDATE,
  Node,
  type NodeJSON,
  type NodeOptions,
} from "./core/Node.ts";
export {
  type Intersection,
  type RaycastCamera,
  Raycaster,
  type RaycastObject,
} from "./core/Raycaster.ts";
export { Scene, type SceneJSON } from "./core/Scene.ts";
export { Timer } from "./core/Timer.ts";
// curves
export { Curve, type FrenetFrames } from "./curves/Curve.ts";
export { CurvePath } from "./curves/CurvePath.ts";
export { ArcCurve } from "./curves/curves/ArcCurve.ts";
export {
  CatmullRomCurve3,
  type CurveType,
} from "./curves/curves/CatmullRomCurve3.ts";
export { CubicBezierCurve } from "./curves/curves/CubicBezierCurve.ts";
export { CubicBezierCurve3 } from "./curves/curves/CubicBezierCurve3.ts";
export { EllipseCurve } from "./curves/curves/EllipseCurve.ts";
export { LineCurve } from "./curves/curves/LineCurve.ts";
export { LineCurve3 } from "./curves/curves/LineCurve3.ts";
export { QuadraticBezierCurve } from "./curves/curves/QuadraticBezierCurve.ts";
export { QuadraticBezierCurve3 } from "./curves/curves/QuadraticBezierCurve3.ts";
export { SplineCurve } from "./curves/curves/SplineCurve.ts";
export { type NURBSControlPoint, NURBSCurve } from "./curves/NURBSCurve.ts";
export { NURBSSurface } from "./curves/NURBSSurface.ts";
export {
  calcBasisFunctionDerivatives,
  calcBasisFunctions,
  calcBSplineDerivatives,
  calcBSplinePoint,
  calcKoverI,
  calcNURBSDerivatives,
  calcRationalCurveDerivatives,
  calcSurfacePoint,
  calcVolumePoint,
  findSpan,
} from "./curves/NURBSUtils.ts";
export { NURBSVolume } from "./curves/NURBSVolume.ts";
export { Path } from "./curves/Path.ts";
export { Shape } from "./curves/Shape.ts";
export { ShapePath } from "./curves/ShapePath.ts";
export {
  parsePath,
  parseSVGPath,
  SVGPathParser,
} from "./curves/SVGPathParser.ts";
export {
  createSVGPathElement,
  pathToSVG,
  type SVGPathSerializerOptions,
  serializeSVGPath,
  serializeSVGShapePath,
} from "./curves/SVGPathSerializer.ts";
export {
  type EXRCompression,
  EXRExporter,
  type EXRExporterOptions,
  type EXRPixelArray,
  type EXRPixelSource,
} from "./exporters/EXRExporter.ts";
export {
  GCodeExporter,
  type GCodeExporterOptions,
  type GCodePath,
  type GCodePoint,
  type GCodeSlice,
} from "./exporters/GCodeExporter.ts";
export {
  type GLTFExportAccessor,
  type GLTFExportAnimation,
  type GLTFExportAnimationChannel,
  type GLTFExportAnimationSampler,
  type GLTFExportBuffer,
  type GLTFExportBufferView,
  type GLTFExportDocument,
  GLTFExporter,
  type GLTFExporterOptions,
  type GLTFExportImage,
  type GLTFExportMaterial,
  type GLTFExportMesh,
  type GLTFExportNode,
  type GLTFExportPrimitive,
  type GLTFExportResult,
  type GLTFExportSampler,
  type GLTFExportScene,
  type GLTFExportTexture,
} from "./exporters/GLTFExporter.ts";
export {
  MTLExporter,
  type MTLExporterOptions,
} from "./exporters/MTLExporter.ts";
// exporters
export {
  OBJExporter,
  type OBJExporterOptions,
} from "./exporters/OBJExporter.ts";
export {
  PLYExporter,
  type PLYExporterOptions,
} from "./exporters/PLYExporter.ts";
export { STLExporter } from "./exporters/STLExporter.ts";
// geometry
export {
  Attribute,
  type AttributeArray,
  toNormalizedTypeName,
  toType,
} from "./geometry/Attribute.ts";
export { Geometry } from "./geometry/Geometry.ts";
export { InterleavedAttribute } from "./geometry/InterleavedAttribute.ts";
export { InterleavedData } from "./geometry/InterleavedData.ts";
// geometry/primitives
export { BoxGeometry } from "./geometry/primitives/BoxGeometry.ts";
export { CapsuleGeometry } from "./geometry/primitives/CapsuleGeometry.ts";
export { CircleGeometry } from "./geometry/primitives/CircleGeometry.ts";
export { ConeGeometry } from "./geometry/primitives/ConeGeometry.ts";
export { ConvexGeometry } from "./geometry/primitives/ConvexGeometry.ts";
export { CylinderGeometry } from "./geometry/primitives/CylinderGeometry.ts";
export { DodecahedronGeometry } from "./geometry/primitives/DodecahedronGeometry.ts";
export { EdgesGeometry } from "./geometry/primitives/EdgesGeometry.ts";
export { ExtrudeGeometry } from "./geometry/primitives/ExtrudeGeometry.ts";
export { IcosahedronGeometry } from "./geometry/primitives/IcosahedronGeometry.ts";
export { LatheGeometry } from "./geometry/primitives/LatheGeometry.ts";
export { OctahedronGeometry } from "./geometry/primitives/OctahedronGeometry.ts";
export {
  type ParametricFunction,
  ParametricGeometry,
} from "./geometry/primitives/ParametricGeometry.ts";
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
export {
  type ArrowDirection,
  ArrowHelper,
  type ArrowHelperOptions,
} from "./helpers/ArrowHelper.ts";
// helpers
export {
  AxesHelper,
  type AxisColors,
  type AxisColorValues,
} from "./helpers/AxesHelper.ts";
export { Box3Helper } from "./helpers/Box3Helper.ts";
export {
  BoxHelper,
  type BoxHelperObject,
  type BoxHelperSource,
} from "./helpers/BoxHelper.ts";
export {
  CameraHelper,
  type CameraHelperColors,
  type CameraHelperColorValues,
} from "./helpers/CameraHelper.ts";
export { DirectionalLightHelper } from "./helpers/DirectionalLightHelper.ts";
export {
  GridHelper,
  type GridHelperColors,
  type GridHelperColorValues,
} from "./helpers/GridHelper.ts";
export { HemisphereLightHelper } from "./helpers/HemisphereLightHelper.ts";
export { PlaneHelper } from "./helpers/PlaneHelper.ts";
export { PointLightHelper } from "./helpers/PointLightHelper.ts";
export {
  PolarGridHelper,
  type PolarGridHelperColors,
  type PolarGridHelperColorValues,
} from "./helpers/PolarGridHelper.ts";
export {
  SkeletonHelper,
  type SkeletonHelperColors,
  type SkeletonHelperColorValues,
} from "./helpers/SkeletonHelper.ts";
export { SpotLightHelper } from "./helpers/SpotLightHelper.ts";
// lights
export { AmbientLight } from "./lights/AmbientLight.ts";
export { DirectionalLight } from "./lights/DirectionalLight.ts";
export {
  HemisphereLight,
  type HemisphereLightJSON,
} from "./lights/HemisphereLight.ts";
export { Light, type LightJSON } from "./lights/Light.ts";
export { LightProbe, type LightProbeJSON } from "./lights/LightProbe.ts";
export { PointLight, type PointLightJSON } from "./lights/PointLight.ts";
export {
  RectAreaLight,
  type RectAreaLightJSON,
} from "./lights/RectAreaLight.ts";
export { SpotLight, type SpotLightJSON } from "./lights/SpotLight.ts";
// loaders
export { AnimationLoader } from "./loaders/AnimationLoader.ts";
export { AudioLoader } from "./loaders/AudioLoader.ts";
export {
  type BVHChannel,
  BVHLoader,
  type BVHLoaderOptions,
  type BVHLoaderResult,
} from "./loaders/BVHLoader.ts";
export { Cache } from "./loaders/Cache.ts";
export { DataTextureLoader } from "./loaders/DataTextureLoader.ts";
export {
  DDSLoader,
  type DDSMipmap,
  type DDSParseResult,
  type DDSPixelFormat,
} from "./loaders/DDSLoader.ts";
export { FileLoader, type FileResponseType } from "./loaders/FileLoader.ts";
export { GCodeLoader } from "./loaders/GCodeLoader.ts";
export { GeometryLoader } from "./loaders/GeometryLoader.ts";
export {
  HDRLoader,
  type HDRFormat,
  type HDRParseResult,
  type HDRTextureOptions,
  type HDRToneMapping,
  RGBELoader,
} from "./loaders/HDRLoader.ts";
export {
  type GLTFAnimation,
  type GLTFAnimationChannel,
  type GLTFAnimationTarget,
  type GLTFDocument,
  type GLTFInstanceAttributeInfo,
  GLTFLoader,
  type GLTFLoaderOptions,
  type GLTFLoaderResult,
  type GLTFMaterialInfo,
  type GLTFNodeInstancingInfo,
  type GLTFNodeLODInfo,
  type GLTFTextureMap,
  type GLTFTextureReference,
  type GLTFVariantInfo,
  type GLTFVariantMapping,
} from "./loaders/GLTFLoader.ts";
export { ImageBitmapLoader } from "./loaders/ImageBitmapLoader.ts";
export { ImageLoader } from "./loaders/ImageLoader.ts";
export { Loader } from "./loaders/Loader.ts";
export { extractUrlBase, resolveUrl } from "./loaders/LoaderUtils.ts";
export {
  DefaultLoadingManager,
  type LoaderHandler,
  LoadingManager,
} from "./loaders/LoadingManager.ts";
export { MaterialLoader } from "./loaders/MaterialLoader.ts";
export {
  MTLLoader,
  type MTLLoaderOptions,
  type MTLLoaderResult,
  type MTLMaterialDefinition,
  type MTLMaterialInfo,
  type MTLMaterialOptions,
  MTLMaterialTable,
  type MTLMaterialType,
  type MTLTextureReference,
} from "./loaders/MTLLoader.ts";
export {
  type NRRDAxis,
  type NRRDDataArray,
  type NRRDEncoding,
  type NRRDHeader,
  type NRRDInput,
  NRRDLoader,
  type NRRDScalarType,
  type NRRDSlice,
  type NRRDTextureOptions,
  NRRDVolume,
} from "./loaders/NRRDLoader.ts";
export {
  OBJLoader,
  type OBJLoaderOptions,
  type OBJMaterialTable,
} from "./loaders/OBJLoader.ts";
export { ObjectLoader } from "./loaders/ObjectLoader.ts";
export { PCDLoader } from "./loaders/PCDLoader.ts";
export {
  type PDBAtom,
  type PDBJSON,
  PDBLoader,
  type PDBParseResult,
} from "./loaders/PDBLoader.ts";
export {
  type PLYCustomPropertyMapping,
  PLYLoader,
  type PLYPropertyNameMapping,
  type PLYScalarType,
} from "./loaders/PLYLoader.ts";
export { STLLoader } from "./loaders/STLLoader.ts";
export {
  SVGLoader,
  type SVGLoaderResult,
  type SVGPathMetadata,
  type SVGStyle,
} from "./loaders/SVGLoader.ts";
export { TextureLoader } from "./loaders/TextureLoader.ts";
export { TGALoader } from "./loaders/TGALoader.ts";
export {
  TIFFLoader,
  type TIFFParseResult,
  type TIFFPhotometric,
} from "./loaders/TIFFLoader.ts";
export {
  type TTFBoundingBox,
  type TTFDirection,
  TTFFont,
  type TTFGlyph,
  TTFLoader,
  type TTFLoaderResult,
} from "./loaders/TTFLoader.ts";
export {
  buildMesh,
  buildMesh as buildVOXMesh,
  buildVoxelVolume,
  type VOXChunk,
  type VOXFrame,
  type VOXGroupNode,
  VOXLoader,
  type VOXLoaderResult,
  VOXMesh,
  type VOXModelReference,
  type VOXNode,
  type VOXShapeNode,
  type VOXSize,
  type VOXTransformNode,
  type VOXTranslation,
  type VOXVoxelVolume,
} from "./loaders/VOXLoader.ts";
export { XYZLoader } from "./loaders/XYZLoader.ts";
// materials
export {
  BasicMaterial,
  type BasicMaterialJSON,
  type BasicMaterialOptions,
} from "./materials/BasicMaterial.ts";
export {
  DashedLineMaterial,
  type DashedLineMaterialJSON,
  type DashedLineMaterialOptions,
} from "./materials/DashedLineMaterial.ts";
export {
  LambertMaterial,
  type LambertMaterialJSON,
  type LambertMaterialOptions,
} from "./materials/LambertMaterial.ts";
export {
  LineMaterial,
  type LineMaterialJSON,
  type LineMaterialOptions,
} from "./materials/LineMaterial.ts";
export {
  Material,
  type MaterialJSON,
  type MaterialOptions,
} from "./materials/Material.ts";
export {
  PointsMaterial,
  type PointsMaterialJSON,
  type PointsMaterialOptions,
} from "./materials/PointsMaterial.ts";
export {
  SpriteMaterial,
  type SpriteMaterialJSON,
  type SpriteMaterialOptions,
} from "./materials/SpriteMaterial.ts";
export {
  ToonMaterial,
  type ToonMaterialJSON,
  type ToonMaterialOptions,
} from "./materials/ToonMaterial.ts";
export { Box2 } from "./math/Box2.ts";
export { Box3 } from "./math/Box3.ts";
export { Capsule } from "./math/Capsule.ts";
export {
  COLOR_HUE_SCALE,
  COLOR_LIGHTNESS_SCALE,
  COLOR_RGB_SCALE,
  COLOR_SATURATION_SCALE,
  Color,
  type ColorValue,
  colorFromHsl16,
  colorToRgb,
  type HSL,
  type RGB,
  type RGBArray,
} from "./math/Color.ts";
export { Cylindrical } from "./math/Cylindrical.ts";
export { fromHalfFloat, toHalfFloat } from "./math/DataUtils.ts";
// math
export { earcut } from "./math/Earcut.ts";
export { Euler } from "./math/Euler.ts";
export { Frustum } from "./math/Frustum.ts";
export {
  decodeHsl16,
  encodeHsl16,
  HSL16_BLACK,
  HSL16_WHITE,
} from "./math/Hsl16.ts";
export { Line3 } from "./math/Line3.ts";
export {
  clamp,
  DEG2RAD,
  EPSILON,
  fastAtan2,
  fastMax,
  fastMin,
  fastRound,
  fastTrunc,
  HALF_PI,
  isPowerOf2,
  nextPowerOf2,
  QUARTER_PI,
  RAD2DEG,
  SIXTH_PI,
  safeAsin,
  TAU,
  THIRD_PI,
  tileDistance,
  toDegrees,
  toRadians,
} from "./math/MathUtils.ts";
export { Matrix2 } from "./math/Matrix2.ts";
export { Matrix3 } from "./math/Matrix3.ts";
export { Matrix4 } from "./math/Matrix4.ts";
export { OBB } from "./math/OBB.ts";
export { Plane } from "./math/Plane.ts";
export {
  multiplyQuaternionsFlat,
  Quaternion,
  type QuaternionArray,
  slerpQuaternionsFlat,
} from "./math/Quaternion.ts";
export { Ray } from "./math/Ray.ts";
export {
  isShapeClockwise,
  type ShapePoint2D,
  shapeArea,
  triangulateShape,
} from "./math/ShapeUtils.ts";
export { Sphere } from "./math/Sphere.ts";
export { Spherical } from "./math/Spherical.ts";
export {
  SphericalHarmonics3,
  type SphericalHarmonicsBasis,
  type SphericalHarmonicsCoefficients,
  sphericalHarmonicsBasis,
} from "./math/SphericalHarmonics3.ts";
export {
  interpolateTriangle,
  isTriangleFrontFacing,
  Triangle,
  triangleBarycoord,
  triangleContainsPoint,
  triangleNormal,
} from "./math/Triangle.ts";
export { cross2, dot2, Vector2 } from "./math/Vector2.ts";
export { cross3, dot3, Vector3 } from "./math/Vector3.ts";
export { dot4, Vector4 } from "./math/Vector4.ts";
// objects
export { Bone } from "./objects/Bone.ts";
export { CSS2DObject } from "./objects/CSS2DObject.ts";
export { CSS3DObject, CSS3DSprite } from "./objects/CSS3DObject.ts";
export { Group } from "./objects/Group.ts";
export { InstancedMesh } from "./objects/InstancedMesh.ts";
export { Line } from "./objects/Line.ts";
export { LineLoop } from "./objects/LineLoop.ts";
export { LineSegments } from "./objects/LineSegments.ts";
export { LOD, type LODLevel } from "./objects/LOD.ts";
export { Mesh } from "./objects/Mesh.ts";
export { Points } from "./objects/Points.ts";
export { Skeleton } from "./objects/Skeleton.ts";
export { SkinnedMesh } from "./objects/SkinnedMesh.ts";
export { Sprite } from "./objects/Sprite.ts";
export { SVGObject } from "./objects/SVGObject.ts";
// physics
export {
  CharacterController,
  type CharacterControllerFrameHost,
  type CharacterControllerOptions,
} from "./physics/CharacterController.ts";
export {
  HeightfieldShape,
  type HeightfieldShapeOptions,
} from "./physics/HeightfieldShape.ts";
export {
  type CapsuleIntersection,
  Octree,
  type OctreeGraphOptions,
  type TriangleCapsuleIntersection,
} from "./physics/Octree.ts";
export {
  DistanceConstraint,
  type DistanceConstraintOptions,
  Particle,
  type ParticleFrameHost,
  type ParticleOptions,
  ParticleWorld,
  type ParticleWorldOptions,
} from "./physics/ParticlePhysics.ts";
export {
  DistanceJoint,
  type DistanceJointOptions,
  PhysicsJoint,
  type PhysicsJointOptions,
  PhysicsJoints,
  type PhysicsJointsOptions,
  type PhysicsJointType,
  RevoluteJoint,
  type RevoluteJointOptions,
  SphericalJoint,
  type SphericalJointOptions,
  SpringJoint,
  type SpringJointOptions,
} from "./physics/PhysicsJoints.ts";
export {
  AABBShape,
  CircleShape,
  type PhysicsContact,
  type PhysicsFrameHost,
  type PhysicsShape,
  PhysicsWorld,
  type PhysicsWorldOptions,
  RigidBody,
  type RigidBodyOptions,
  SphereShape,
} from "./physics/PhysicsWorld.ts";
export {
  VehicleController,
  type VehicleControllerOptions,
  type VehicleInput,
  type VehicleWheel,
} from "./physics/VehicleController.ts";
export { ColorTable } from "./pipeline/color/ColorTable.ts";
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
export {
  CSS2DRenderer,
  type CSS2DRendererOptions,
} from "./renderers/CSS2DRenderer.ts";
export {
  CSS3DRenderer,
  type CSS3DRendererOptions,
} from "./renderers/CSS3DRenderer.ts";
// pipeline (advanced - typically consumed via Renderer)
export {
  Renderer,
  type RendererOptions,
  type RenderTimings,
} from "./renderers/Renderer.ts";
export {
  SVGRenderer,
  type SVGRendererOptions,
} from "./renderers/SVGRenderer.ts";
// scenes
export {
  Fog,
  FogExp2,
  type FogJSON,
  FogMode,
  type FogModeType,
  type FogOptions,
} from "./scenes/Fog.ts";
// textures
export { CanvasTexture } from "./textures/CanvasTexture.ts";
export { DataTexture } from "./textures/DataTexture.ts";
export { FramebufferTexture } from "./textures/FramebufferTexture.ts";
export {
  Source,
  type SourceImage,
  type SourceJSON,
  type SourcePixelJSON,
  type SourceSerializationMeta,
} from "./textures/Source.ts";
export {
  DEFAULT_ANISOTROPY,
  DEFAULT_IMAGE,
  DEFAULT_MAPPING,
  TEXTURE_BRIGHTNESS_LEVELS,
  Texture,
  type TextureImageSource,
  type TextureJSON,
  type TextureSerializationMeta,
} from "./textures/Texture.ts";
export { VideoTexture } from "./textures/VideoTexture.ts";
export {
  getDataUrl,
  type ImageDataLike,
  type ImagePixelArray,
  srgbToLinear,
} from "./utils/ImageUtils.ts";
export {
  DataUtils,
  ImageUtils,
  ShapeUtils,
  TextureUtils,
} from "./utils/Utils.ts";
export {
  type ConsoleFunction,
  type ConsoleType,
  error,
  getConsoleFunction,
  log,
  setConsoleFunction,
  warn,
  warnOnce,
} from "./utils/ConsoleUtils.ts";
