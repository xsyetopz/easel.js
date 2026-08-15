# API exports

Source: repository `src/index.ts` at `REVISION = "0.7.0"`. This is the root
package surface; do not import the listed source paths from application code. Values
are runtime imports; types require `import type` when `verbatimModuleSyntax` is enabled.

- Root value: `REVISION` (`"0.7.0"`).

## animation

- `./animation/AnimationAction.ts` — values: `AnimationAction`, `Loop`; types: `LoopMode`
- `./animation/AnimationClip.ts` — values: `AnimationBlend`, `AnimationClip`, `animationClipFromJson`, `animationClipToJSON`, `findAnimationClip`, `findByName`, `parse`, `CreateFromMorphTargetSequence`, `CreateClipsFromMorphTargetSequences`; types: `AnimationBlendMode`, `AnimationClipJSON`, `AnimationClipTrackJSON`
- `./animation/AnimationGroup.ts` — values: `AnimationGroup`
- `./animation/AnimationUtils.ts` — values: `convertArray`, `flattenJSON`, `getKeyframeOrder`, `isTypedArray`, `makeClipAdditive`, `sortedArray`, `subclip`; types: `FlatKeyframe`, `NumericTypedArray`, `NumericTypedArrayConstructor`
- `./animation/Animator.ts` — values: `Animator`
- `./animation/Binding.ts` — values: `Binding`, `findBindingNode`, `findNode`, `parseBindingPath`, `parseTrackName`, `sanitizeBindingNodeName`; types: `BindingPath`
- `./animation/PropertyMixer.ts` — values: `PropertyMixer`
- `./animation/Track.ts` — values: `Interpolation`, `InterpolationEnding`, `Track`; types: `AnimationTrack`, `InterpolationEndingMode`, `InterpolationMode`, `TrackOptions`, `TrackValue`, `TrackValueType`
- `./animation/interpolants/Interpolant.ts` — values: `Interpolant`
- `./animation/interpolants/LinearInterpolant.ts` — values: `LinearInterpolant`
- `./animation/interpolants/DiscreteInterpolant.ts` — values: `DiscreteInterpolant`
- `./animation/interpolants/CubicInterpolant.ts` — values: `CubicInterpolant`
- `./animation/interpolants/BezierInterpolant.ts` — values: `BezierInterpolant`
- `./animation/interpolants/QuaternionLinearInterpolant.ts` — values: `QuaternionLinearInterpolant`
- `./animation/tracks/BooleanTrack.ts` — values: `BooleanTrack`
- `./animation/tracks/ColorTrack.ts` — values: `ColorTrack`
- `./animation/tracks/NumberTrack.ts` — values: `NumberTrack`
- `./animation/tracks/QuaternionTrack.ts` — values: `QuaternionTrack`
- `./animation/tracks/StringTrack.ts` — values: `StringTrack`
- `./animation/tracks/VectorTrack.ts` — values: `VectorTrack`

## audio

- `./audio/AudioAnalyzer.ts` — values: `AudioAnalyzer`; types: `AudioAnalyzerOptions`
- `./audio/AudioVisualizer.ts` — values: `drawAudioAnalyzer`, `drawFrequencyBars`, `drawTimeDomainWaveform`; types: `CanvasAudioContext`, `AudioVisualizerOptions`
- `./audio/Audio.ts` — values: `Audio`; types: `AudioSourceType`
- `./audio/AudioContext.ts` — values: `getAudioContext`, `setAudioContext`
- `./audio/AudioListener.ts` — values: `AudioListener`
- `./audio/PositionalAudio.ts` — values: `PositionalAudio`
- `./audio/AudioGraph.ts` — values: `AudioGraph`, `createBrowserAudioContext`; types: `AudioGraphOptions`
- `./audio/AudioTypes.ts` — types: `AnalyserNodeLike`, `AudioBufferLike`, `AudioBufferSourceNodeLike`, `AudioContextLike`, `AudioNodeLike`, `AudioParamLike`, `NativeAudioListenerLike`, `OscillatorNodeLike`, `PannerNodeLike`, `StereoPannerNodeLike`

## cameras

- `./cameras/Camera.ts` — values: `assertCameraViewOffset`, `Camera`, `makeCameraView`; types: `CameraJSON`, `CameraOptions`, `CameraView`
- `./cameras/OrthographicCamera.ts` — values: `OrthographicCamera`; types: `OrthographicCameraJSON`, `OrthographicCameraOptions`
- `./cameras/ArrayCamera.ts` — values: `ArrayCamera`; types: `ArrayCameraOptions`
- `./cameras/PerspectiveCamera.ts` — values: `PerspectiveCamera`; types: `PerspectiveCameraJSON`, `PerspectiveCameraOptions`
- `./cameras/StereoCamera.ts` — values: `StereoCamera`

## controls

- `./controls/ArcballControls.ts` — values: `ArcballControls`; types: `ArcballCamera`, `MouseAction`
- `./controls/DragControls.ts` — values: `DragControls`; types: `DragControlsEvent`
- `./controls/Controls.ts` — values: `Controls`
- `./controls/FirstPersonControls.ts` — values: `FirstPersonControls`
- `./controls/FlyControls.ts` — values: `FlyControls`
- `./controls/MapControls.ts` — values: `MapControls`
- `./controls/OrbitControls.ts` — values: `OrbitControls`
- `./controls/PointerLockControls.ts` — values: `PointerLockControls`
- `./controls/TrackballControls.ts` — values: `TrackballControls`
- `./controls/TransformControls.ts` — values: `TransformControls`; types: `TransformAxis`, `TransformMode`, `TransformPointer`, `TransformSpace`, `TransformViewport`

## core

- `./core/Constants.ts` — values: `BindMode`, `ColorManagement`, `Compatibility`, `InterpolationSamplingMode`, `InterpolationSamplingType`, `Layer`, `LightType`, `LinearTransfer`, `MOUSE`, `NoNormalPacking`, `NormalGAPacking`, `NormalRGPacking`, `Shading`, `Side`, `SRGBTransfer`, `TOUCH`, `TriangleFanDrawMode`, `TriangleStripDrawMode`, `TrianglesDrawMode`, `Wrapping`
- `./core/EventDispatcher.ts` — values: `EventDispatcher`
- `./core/Layers.ts` — values: `Layers`
- `./core/Node.ts` — values: `DEFAULT_UP`, `DEFAULT_MATRIX_AUTO_UPDATE`, `DEFAULT_MATRIX_WORLD_AUTO_UPDATE`, `Node`; types: `NodeJSON`, `NodeOptions`
- `./core/Raycaster.ts` — values: `Raycaster`; types: `Intersection`, `RaycastCamera`, `RaycastObject`
- `./core/Scene.ts` — values: `Scene`; types: `SceneJSON`
- `./core/Timer.ts` — values: `Timer`

## curves

- `./curves/Curve.ts` — values: `Curve`; types: `FrenetFrames`
- `./curves/CurvePath.ts` — values: `CurvePath`
- `./curves/curves/ArcCurve.ts` — values: `ArcCurve`
- `./curves/curves/CatmullRomCurve3.ts` — values: `CatmullRomCurve3`; types: `CurveType`
- `./curves/curves/CubicBezierCurve.ts` — values: `CubicBezierCurve`
- `./curves/curves/CubicBezierCurve3.ts` — values: `CubicBezierCurve3`
- `./curves/curves/EllipseCurve.ts` — values: `EllipseCurve`
- `./curves/curves/LineCurve.ts` — values: `LineCurve`
- `./curves/curves/LineCurve3.ts` — values: `LineCurve3`
- `./curves/curves/QuadraticBezierCurve.ts` — values: `QuadraticBezierCurve`
- `./curves/curves/QuadraticBezierCurve3.ts` — values: `QuadraticBezierCurve3`
- `./curves/curves/SplineCurve.ts` — values: `SplineCurve`
- `./curves/NURBSCurve.ts` — values: `NURBSCurve`; types: `NURBSControlPoint`
- `./curves/NURBSSurface.ts` — values: `NURBSSurface`
- `./curves/NURBSUtils.ts` — values: `calcBasisFunctionDerivatives`, `calcBasisFunctions`, `calcBSplineDerivatives`, `calcBSplinePoint`, `calcKoverI`, `calcNURBSDerivatives`, `calcRationalCurveDerivatives`, `calcSurfacePoint`, `calcVolumePoint`, `findSpan`
- `./curves/NURBSVolume.ts` — values: `NURBSVolume`
- `./curves/Path.ts` — values: `Path`
- `./curves/Shape.ts` — values: `Shape`
- `./curves/ShapePath.ts` — values: `ShapePath`
- `./curves/SVGPathParser.ts` — values: `parsePath`, `parseSVGPath`, `SVGPathParser`
- `./curves/SVGPathSerializer.ts` — values: `createSVGPathElement`, `pathToSVG`, `serializeSVGPath`, `serializeSVGShapePath`; types: `SVGPathSerializerOptions`

## exporters

- `./exporters/EXRExporter.ts` — values: `EXRExporter`; types: `EXRCompression`, `EXRExporterOptions`, `EXRPixelArray`, `EXRPixelSource`
- `./exporters/GCodeExporter.ts` — values: `GCodeExporter`; types: `GCodeExporterOptions`, `GCodePath`, `GCodePoint`, `GCodeSlice`
- `./exporters/GLTFExporter.ts` — values: `GLTFExporter`; types: `GLTFExportAccessor`, `GLTFExportAnimation`, `GLTFExportAnimationChannel`, `GLTFExportAnimationSampler`, `GLTFExportBuffer`, `GLTFExportBufferView`, `GLTFExportDocument`, `GLTFExporterOptions`, `GLTFExportImage`, `GLTFExportMaterial`, `GLTFExportMesh`, `GLTFExportNode`, `GLTFExportPrimitive`, `GLTFExportResult`, `GLTFExportSampler`, `GLTFExportScene`, `GLTFExportTexture`
- `./exporters/MTLExporter.ts` — values: `MTLExporter`; types: `MTLExporterOptions`
- `./exporters/OBJExporter.ts` — values: `OBJExporter`; types: `OBJExporterOptions`
- `./exporters/PLYExporter.ts` — values: `PLYExporter`; types: `PLYExporterOptions`
- `./exporters/STLExporter.ts` — values: `STLExporter`

## geometry

- `./geometry/Attribute.ts` — values: `Attribute`, `toNormalizedTypeName`, `toType`; types: `AttributeArray`
- `./geometry/Geometry.ts` — values: `Geometry`
- `./geometry/InterleavedAttribute.ts` — values: `InterleavedAttribute`
- `./geometry/InterleavedData.ts` — values: `InterleavedData`
- `./geometry/primitives/BoxGeometry.ts` — values: `BoxGeometry`
- `./geometry/primitives/CapsuleGeometry.ts` — values: `CapsuleGeometry`
- `./geometry/primitives/CircleGeometry.ts` — values: `CircleGeometry`
- `./geometry/primitives/ConeGeometry.ts` — values: `ConeGeometry`
- `./geometry/primitives/ConvexGeometry.ts` — values: `ConvexGeometry`
- `./geometry/primitives/CylinderGeometry.ts` — values: `CylinderGeometry`
- `./geometry/primitives/DodecahedronGeometry.ts` — values: `DodecahedronGeometry`
- `./geometry/primitives/EdgesGeometry.ts` — values: `EdgesGeometry`
- `./geometry/primitives/ExtrudeGeometry.ts` — values: `ExtrudeGeometry`
- `./geometry/primitives/IcosahedronGeometry.ts` — values: `IcosahedronGeometry`
- `./geometry/primitives/LatheGeometry.ts` — values: `LatheGeometry`
- `./geometry/primitives/OctahedronGeometry.ts` — values: `OctahedronGeometry`
- `./geometry/primitives/ParametricGeometry.ts` — values: `ParametricGeometry`; types: `ParametricFunction`
- `./geometry/primitives/PlaneGeometry.ts` — values: `PlaneGeometry`
- `./geometry/primitives/PolyhedronGeometry.ts` — values: `PolyhedronGeometry`
- `./geometry/primitives/RingGeometry.ts` — values: `RingGeometry`
- `./geometry/primitives/ShapeGeometry.ts` — values: `ShapeGeometry`
- `./geometry/primitives/SphereGeometry.ts` — values: `SphereGeometry`
- `./geometry/primitives/TetrahedronGeometry.ts` — values: `TetrahedronGeometry`
- `./geometry/primitives/TorusGeometry.ts` — values: `TorusGeometry`
- `./geometry/primitives/TorusKnotGeometry.ts` — values: `TorusKnotGeometry`
- `./geometry/primitives/TubeGeometry.ts` — values: `TubeGeometry`
- `./geometry/primitives/WireframeGeometry.ts` — values: `WireframeGeometry`

## helpers

- `./helpers/ArrowHelper.ts` — values: `ArrowHelper`; types: `ArrowDirection`, `ArrowHelperOptions`
- `./helpers/AxesHelper.ts` — values: `AxesHelper`; types: `AxisColors`, `AxisColorValues`
- `./helpers/Box3Helper.ts` — values: `Box3Helper`
- `./helpers/BoxHelper.ts` — values: `BoxHelper`; types: `BoxHelperObject`, `BoxHelperSource`
- `./helpers/CameraHelper.ts` — values: `CameraHelper`; types: `CameraHelperColors`, `CameraHelperColorValues`
- `./helpers/DirectionalLightHelper.ts` — values: `DirectionalLightHelper`
- `./helpers/GridHelper.ts` — values: `GridHelper`; types: `GridHelperColors`, `GridHelperColorValues`
- `./helpers/HemisphereLightHelper.ts` — values: `HemisphereLightHelper`
- `./helpers/PlaneHelper.ts` — values: `PlaneHelper`
- `./helpers/PointLightHelper.ts` — values: `PointLightHelper`
- `./helpers/PolarGridHelper.ts` — values: `PolarGridHelper`; types: `PolarGridHelperColors`, `PolarGridHelperColorValues`
- `./helpers/SkeletonHelper.ts` — values: `SkeletonHelper`; types: `SkeletonHelperColors`, `SkeletonHelperColorValues`
- `./helpers/SpotLightHelper.ts` — values: `SpotLightHelper`

## lights

- `./lights/AmbientLight.ts` — values: `AmbientLight`
- `./lights/DirectionalLight.ts` — values: `DirectionalLight`
- `./lights/HemisphereLight.ts` — values: `HemisphereLight`; types: `HemisphereLightJSON`
- `./lights/Light.ts` — values: `Light`; types: `LightJSON`
- `./lights/LightProbe.ts` — values: `LightProbe`; types: `LightProbeJSON`
- `./lights/PointLight.ts` — values: `PointLight`; types: `PointLightJSON`
- `./lights/RectAreaLight.ts` — values: `RectAreaLight`; types: `RectAreaLightJSON`
- `./lights/SpotLight.ts` — values: `SpotLight`; types: `SpotLightJSON`

## loaders

- `./loaders/AnimationLoader.ts` — values: `AnimationLoader`
- `./loaders/AudioLoader.ts` — values: `AudioLoader`
- `./loaders/BVHLoader.ts` — values: `BVHLoader`; types: `BVHChannel`, `BVHLoaderOptions`, `BVHLoaderResult`
- `./loaders/Cache.ts` — values: `Cache`
- `./loaders/DataTextureLoader.ts` — values: `DataTextureLoader`
- `./loaders/DDSLoader.ts` — values: `DDSLoader`; types: `DDSMipmap`, `DDSParseResult`, `DDSPixelFormat`
- `./loaders/FileLoader.ts` — values: `FileLoader`; types: `FileResponseType`
- `./loaders/GCodeLoader.ts` — values: `GCodeLoader`
- `./loaders/GeometryLoader.ts` — values: `GeometryLoader`
- `./loaders/BufferGeometryLoader.ts` — values: `BufferGeometryLoader`
- `./loaders/HDRLoader.ts` — values: `HDRLoader`, `RGBELoader`; types: `HDRFormat`, `HDRParseResult`, `HDRTextureOptions`, `HDRToneMapping`
- `./loaders/GLTFLoader.ts` — values: `GLTFLoader`; types: `GLTFAnimation`, `GLTFAnimationChannel`, `GLTFAnimationTarget`, `GLTFDocument`, `GLTFInstanceAttributeInfo`, `GLTFLoaderOptions`, `GLTFLoaderResult`, `GLTFMaterialInfo`, `GLTFNodeInstancingInfo`, `GLTFNodeLODInfo`, `GLTFTextureMap`, `GLTFTextureReference`, `GLTFVariantInfo`, `GLTFVariantMapping`
- `./loaders/ImageBitmapLoader.ts` — values: `ImageBitmapLoader`
- `./loaders/ImageLoader.ts` — values: `ImageLoader`
- `./loaders/Loader.ts` — values: `Loader`
- `./loaders/LoaderUtils.ts` — values: `extractUrlBase`, `resolveUrl`
- `./loaders/LoadingManager.ts` — values: `DefaultLoadingManager`, `LoadingManager`; types: `LoaderHandler`
- `./loaders/MaterialLoader.ts` — values: `MaterialLoader`
- `./loaders/MTLLoader.ts` — values: `MTLLoader`, `MTLMaterialTable`; types: `MTLLoaderOptions`, `MTLLoaderResult`, `MTLMaterialDefinition`, `MTLMaterialInfo`, `MTLMaterialOptions`, `MTLMaterialType`, `MTLTextureReference`
- `./loaders/NRRDLoader.ts` — values: `NRRDLoader`, `NRRDVolume`; types: `NRRDAxis`, `NRRDDataArray`, `NRRDEncoding`, `NRRDHeader`, `NRRDInput`, `NRRDScalarType`, `NRRDSlice`, `NRRDTextureOptions`
- `./loaders/OBJLoader.ts` — values: `OBJLoader`; types: `OBJLoaderOptions`, `OBJMaterialTable`
- `./loaders/ObjectLoader.ts` — values: `ObjectLoader`
- `./loaders/PCDLoader.ts` — values: `PCDLoader`
- `./loaders/PDBLoader.ts` — values: `PDBLoader`; types: `PDBAtom`, `PDBJSON`, `PDBParseResult`
- `./loaders/PLYLoader.ts` — values: `PLYLoader`; types: `PLYCustomPropertyMapping`, `PLYPropertyNameMapping`, `PLYScalarType`
- `./loaders/STLLoader.ts` — values: `STLLoader`
- `./loaders/SVGLoader.ts` — values: `SVGLoader`; types: `SVGLoaderResult`, `SVGPathMetadata`, `SVGStyle`
- `./loaders/TextureLoader.ts` — values: `TextureLoader`
- `./loaders/TGALoader.ts` — values: `TGALoader`
- `./loaders/TIFFLoader.ts` — values: `TIFFLoader`; types: `TIFFParseResult`, `TIFFPhotometric`
- `./loaders/TTFLoader.ts` — values: `TTFFont`, `TTFLoader`; types: `TTFBoundingBox`, `TTFDirection`, `TTFGlyph`, `TTFLoaderResult`
- `./loaders/VOXLoader.ts` — values: `buildMesh`, `buildVOXMesh` (alias of `buildMesh`), `buildVoxelVolume`, `VOXLoader`, `VOXMesh`; types: `VOXChunk`, `VOXFrame`, `VOXGroupNode`, `VOXLoaderResult`, `VOXModelReference`, `VOXNode`, `VOXShapeNode`, `VOXSize`, `VOXTransformNode`, `VOXTranslation`, `VOXVoxelVolume`
- `./loaders/XYZLoader.ts` — values: `XYZLoader`

## materials

- `./materials/BasicMaterial.ts` — values: `BasicMaterial`; types: `BasicMaterialJSON`, `BasicMaterialOptions`
- `./materials/DashedLineMaterial.ts` — values: `DashedLineMaterial`; types: `DashedLineMaterialJSON`, `DashedLineMaterialOptions`
- `./materials/LambertMaterial.ts` — values: `LambertMaterial`; types: `LambertMaterialJSON`, `LambertMaterialOptions`
- `./materials/LineMaterial.ts` — values: `LineMaterial`; types: `LineMaterialJSON`, `LineMaterialOptions`
- `./materials/Material.ts` — values: `Material`; types: `MaterialJSON`, `MaterialOptions`
- `./materials/PointsMaterial.ts` — values: `PointsMaterial`; types: `PointsMaterialJSON`, `PointsMaterialOptions`
- `./materials/SpriteMaterial.ts` — values: `SpriteMaterial`; types: `SpriteMaterialJSON`, `SpriteMaterialOptions`
- `./materials/ToonMaterial.ts` — values: `ToonMaterial`; types: `ToonMaterialJSON`, `ToonMaterialOptions`

## math

- `./math/Box2.ts` — values: `Box2`
- `./math/Box3.ts` — values: `Box3`
- `./math/Capsule.ts` — values: `Capsule`
- `./math/Color.ts` — values: `COLOR_HUE_SCALE`, `COLOR_LIGHTNESS_SCALE`, `COLOR_RGB_SCALE`, `COLOR_SATURATION_SCALE`, `Color`, `colorFromHsl16`, `colorToRgb`; types: `ColorValue`, `HSL`, `RGB`, `RGBArray`
- `./math/Cylindrical.ts` — values: `Cylindrical`
- `./math/DataUtils.ts` — values: `fromHalfFloat`, `toHalfFloat`
- `./math/Earcut.ts` — values: `earcut`
- `./math/Euler.ts` — values: `Euler`
- `./math/Frustum.ts` — values: `Frustum`
- `./math/Hsl16.ts` — values: `decodeHsl16`, `encodeHsl16`, `HSL16_BLACK`, `HSL16_WHITE`
- `./math/Line3.ts` — values: `Line3`
- `./math/MathUtils.ts` — values: `clamp`, `DEG2RAD`, `EPSILON`, `fastAtan2`, `fastMax`, `fastMin`, `fastRound`, `fastTrunc`, `HALF_PI`, `isPowerOf2`, `nextPowerOf2`, `QUARTER_PI`, `RAD2DEG`, `SIXTH_PI`, `safeAsin`, `TAU`, `THIRD_PI`, `tileDistance`, `toDegrees`, `toRadians`
- `./math/Matrix2.ts` — values: `Matrix2`
- `./math/Matrix3.ts` — values: `Matrix3`
- `./math/Matrix4.ts` — values: `Matrix4`
- `./math/OBB.ts` — values: `OBB`
- `./math/Plane.ts` — values: `Plane`
- `./math/Quaternion.ts` — values: `multiplyQuaternionsFlat`, `Quaternion`, `slerpQuaternionsFlat`; types: `QuaternionArray`
- `./math/Ray.ts` — values: `Ray`
- `./math/ShapeUtils.ts` — values: `isShapeClockwise`, `shapeArea`, `triangulateShape`; types: `ShapePoint2D`
- `./math/Sphere.ts` — values: `Sphere`
- `./math/Spherical.ts` — values: `Spherical`
- `./math/SphericalHarmonics3.ts` — values: `SphericalHarmonics3`, `sphericalHarmonicsBasis`; types: `SphericalHarmonicsBasis`, `SphericalHarmonicsCoefficients`
- `./math/Triangle.ts` — values: `interpolateTriangle`, `isTriangleFrontFacing`, `Triangle`, `triangleBarycoord`, `triangleContainsPoint`, `triangleNormal`
- `./math/Vector2.ts` — values: `cross2`, `dot2`, `Vector2`
- `./math/Vector3.ts` — values: `cross3`, `dot3`, `Vector3`
- `./math/Vector4.ts` — values: `dot4`, `Vector4`

## objects

- `./objects/Bone.ts` — values: `Bone`
- `./objects/CSS2DObject.ts` — values: `CSS2DObject`
- `./objects/CSS3DObject.ts` — values: `CSS3DObject`, `CSS3DSprite`
- `./objects/Group.ts` — values: `Group`
- `./objects/InstancedMesh.ts` — values: `InstancedMesh`
- `./objects/Line.ts` — values: `Line`
- `./objects/LineLoop.ts` — values: `LineLoop`
- `./objects/LineSegments.ts` — values: `LineSegments`
- `./objects/LOD.ts` — values: `LOD`; types: `LODLevel`
- `./objects/Mesh.ts` — values: `Mesh`
- `./objects/Points.ts` — values: `Points`
- `./objects/Skeleton.ts` — values: `Skeleton`
- `./objects/SkinnedMesh.ts` — values: `SkinnedMesh`
- `./objects/Sprite.ts` — values: `Sprite`
- `./objects/SVGObject.ts` — values: `SVGObject`

## physics

- `./physics/CharacterController.ts` — values: `CharacterController`; types: `CharacterControllerFrameHost`, `CharacterControllerOptions`
- `./physics/HeightfieldShape.ts` — values: `HeightfieldShape`; types: `HeightfieldShapeOptions`
- `./physics/Octree.ts` — values: `Octree`; types: `CapsuleIntersection`, `OctreeGraphOptions`, `TriangleCapsuleIntersection`
- `./physics/ParticlePhysics.ts` — values: `DistanceConstraint`, `Particle`, `ParticleWorld`; types: `DistanceConstraintOptions`, `ParticleFrameHost`, `ParticleOptions`, `ParticleWorldOptions`
- `./physics/PhysicsJoints.ts` — values: `DistanceJoint`, `PhysicsJoint`, `PhysicsJoints`, `RevoluteJoint`, `SphericalJoint`, `SpringJoint`; types: `DistanceJointOptions`, `PhysicsJointOptions`, `PhysicsJointsOptions`, `PhysicsJointType`, `RevoluteJointOptions`, `SphericalJointOptions`, `SpringJointOptions`
- `./physics/PhysicsWorld.ts` — values: `AABBShape`, `CircleShape`, `PhysicsWorld`, `RigidBody`, `SphereShape`; types: `PhysicsContact`, `PhysicsFrameHost`, `PhysicsShape`, `PhysicsWorldOptions`, `RigidBodyOptions`
- `./physics/VehicleController.ts` — values: `VehicleController`; types: `VehicleControllerOptions`, `VehicleInput`, `VehicleWheel`

## pipeline

- `./pipeline/color/ColorTable.ts` — values: `ColorTable`
- `./pipeline/color/TranslucencyTable.ts` — values: `TranslucencyTable`
- `./pipeline/DrawCall.ts` — values: `DrawCall`
- `./pipeline/DrawList.ts` — values: `DrawList`
- `./pipeline/FogCuller.ts` — values: `FogCuller`
- `./pipeline/framebuffer/DepthBuffer.ts` — values: `DepthBuffer`
- `./pipeline/framebuffer/Framebuffer.ts` — values: `Framebuffer`
- `./pipeline/framebuffer/FramebufferClear.ts` — values: `FramebufferClear`
- `./pipeline/framebuffer/FramebufferUpload.ts` — values: `FramebufferUpload`
- `./pipeline/PainterSort.ts` — values: `PainterSort`
- `./pipeline/PixelWriter.ts` — values: `PixelWriter`
- `./pipeline/projection/ViewToScreen.ts` — values: `ViewToScreen`
- `./pipeline/projection/WorldToView.ts` — values: `WorldToView`
- `./pipeline/rasterizer/AffineUVSampler.ts` — values: `AffineUVSampler`
- `./pipeline/rasterizer/EdgeWalker.ts` — values: `EdgeWalker`
- `./pipeline/rasterizer/GouraudInterpolator.ts` — values: `GouraudInterpolator`
- `./pipeline/rasterizer/PointRasterizer.ts` — values: `PointRasterizer`
- `./pipeline/rasterizer/Rasterizer.ts` — values: `Rasterizer`
- `./pipeline/rasterizer/ScanlineFill.ts` — values: `ScanlineFill`
- `./pipeline/rasterizer/WireframeRasterizer.ts` — values: `WireframeRasterizer`
- `./pipeline/SceneTraversal.ts` — values: `SceneTraversal`
- `./pipeline/shading/FlatShader.ts` — values: `FlatShader`
- `./pipeline/shading/GouraudShader.ts` — values: `GouraudShader`
- `./pipeline/shading/LightBaker.ts` — values: `LightBaker`
- `./pipeline/sorting/DrawPrioritySorter.ts` — values: `DrawPrioritySorter`
- `./pipeline/sorting/PolygonSorter.ts` — values: `PolygonSorter`
- `./pipeline/sorting/TileDistanceSorter.ts` — values: `TileDistanceSorter`
- `./pipeline/texture/TextureClamp.ts` — values: `TextureClamp`
- `./pipeline/texture/TextureSampler.ts` — values: `TextureSampler`

## renderers

- `./renderers/CSS2DRenderer.ts` — values: `CSS2DRenderer`; types: `CSS2DRendererOptions`
- `./renderers/CSS3DRenderer.ts` — values: `CSS3DRenderer`; types: `CSS3DRendererOptions`
- `./renderers/Renderer.ts` — values: `Renderer`; types: `RendererOptions`, `RenderTimings`
- `./renderers/SVGRenderer.ts` — values: `SVGRenderer`; types: `SVGRendererOptions`

## scenes

- `./scenes/Fog.ts` — values: `Fog`, `FogExp2`, `FogMode`; types: `FogJSON`, `FogModeType`, `FogOptions`

## textures

- `./textures/CanvasTexture.ts` — values: `CanvasTexture`
- `./textures/DataTexture.ts` — values: `DataTexture`
- `./textures/FramebufferTexture.ts` — values: `FramebufferTexture`
- `./textures/Source.ts` — values: `Source`; types: `SourceImage`, `SourceJSON`, `SourcePixelJSON`, `SourceSerializationMeta`
- `./textures/Texture.ts` — values: `DEFAULT_ANISOTROPY`, `DEFAULT_IMAGE`, `DEFAULT_MAPPING`, `TEXTURE_BRIGHTNESS_LEVELS`, `Texture`; types: `TextureImageSource`, `TextureJSON`, `TextureSerializationMeta`
- `./textures/VideoTexture.ts` — values: `VideoTexture`

## utils

- `./utils/ImageUtils.ts` — values: `getDataUrl`, `srgbToLinear`; types: `ImageDataLike`, `ImagePixelArray`
- `./utils/Utils.ts` — values: `DataUtils`, `ImageUtils`, `ShapeUtils`, `TextureUtils`
- `./utils/ConsoleUtils.ts` — values: `error`, `getConsoleFunction`, `log`, `setConsoleFunction`, `warn`, `warnOnce`; types: `ConsoleFunction`, `ConsoleType`
