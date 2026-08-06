import type { ExampleModule } from "../loaders/examples.ts";
import { example as canvasAnimationKeyframes } from "./canvas/animation/canvas_animation_keyframes.js";
import { example as canvasAnimationMultiple } from "./canvas/animation/canvas_animation_multiple.js";
import { example as canvasAnimationSkinningAdditiveBlending } from "./canvas/animation/canvas_animation_skinning_additive_blending.js";
import { example as canvasAnimationSkinningBlending } from "./canvas/animation/canvas_animation_skinning_blending.js";
import { example as canvasAnimationSkinningIk } from "./canvas/animation/canvas_animation_skinning_ik.js";
import { example as canvasAnimationSkinningMorph } from "./canvas/animation/canvas_animation_skinning_morph.js";
import { example as canvasAnimationWalk } from "./canvas/animation/canvas_animation_walk.js";
import { example as canvasBuffergeometry } from "./canvas/direct/canvas_buffergeometry.js";
import { example as canvasBuffergeometryIndexed } from "./canvas/direct/canvas_buffergeometry_indexed.js";
import { example as canvasBuffergeometryLines } from "./canvas/direct/canvas_buffergeometry_lines.js";
import { example as canvasBuffergeometryLinesIndexed } from "./canvas/direct/canvas_buffergeometry_lines_indexed.js";
import { example as canvasCamera } from "./canvas/direct/canvas_camera.js";
import { example as canvasLinesColors } from "./canvas/direct/canvas_lines_colors.js";
import { example as canvasWebgpuCamera } from "./canvas/direct/canvas_webgpu_camera.js";
import { example as canvasBatchLodBvh } from "./canvas/geometry/canvas_batch_lod_bvh.js";
import { example as canvasBuffergeometryAttributesInteger } from "./canvas/geometry/canvas_buffergeometry_attributes_integer.js";
import { example as canvasBuffergeometryAttributesNone } from "./canvas/geometry/canvas_buffergeometry_attributes_none.js";
import { example as canvasBuffergeometryDrawrange } from "./canvas/geometry/canvas_buffergeometry_drawrange.js";
import { example as canvasBuffergeometryInstancing } from "./canvas/geometry/canvas_buffergeometry_instancing.js";
import { example as canvasBuffergeometryInstancingInterleaved } from "./canvas/geometry/canvas_buffergeometry_instancing_interleaved.js";
import { example as canvasBuffergeometrySelectiveDraw } from "./canvas/geometry/canvas_buffergeometry_selective_draw.js";
import { example as canvasGeometryConvex } from "./canvas/geometry/canvas_geometry_convex.js";
import { example as canvasGeometryExtrudeSplines } from "./canvas/geometry/canvas_geometry_extrude_splines.js";
import { example as canvasGeometryMinecraft } from "./canvas/geometry/canvas_geometry_minecraft.js";
import { example as canvasGeometryNurbs } from "./canvas/geometry/canvas_geometry_nurbs.js";
import { example as canvasGeometrySplineEditor } from "./canvas/geometry/canvas_geometry_spline_editor.js";
import { example as canvasGeometryTeapot } from "./canvas/geometry/canvas_geometry_teapot.js";
import { example as canvasGeometryTerrain } from "./canvas/geometry/canvas_geometry_terrain.js";
import { example as canvasGeometryTerrainRaycast } from "./canvas/geometry/canvas_geometry_terrain_raycast.js";
import { example as canvasGeometryText } from "./canvas/geometry/canvas_geometry_text.js";
import { example as canvasGeometryTextShapes } from "./canvas/geometry/canvas_geometry_text_shapes.js";
import { example as canvasGeometryTextStroke } from "./canvas/geometry/canvas_geometry_text_stroke.js";
import { example as canvasMarchingcubes } from "./canvas/geometry/canvas_marchingcubes.js";
import { example as canvasInstancingDynamic } from "./canvas/interaction/canvas_instancing_dynamic.js";
import { example as canvasInstancingRaycast } from "./canvas/interaction/canvas_instancing_raycast.js";
import { example as canvasInteractiveBuffergeometry } from "./canvas/interaction/canvas_interactive_buffergeometry.js";
import { example as canvasInteractiveCubes } from "./canvas/interaction/canvas_interactive_cubes.js";
import { example as canvasInteractiveCubesOrtho } from "./canvas/interaction/canvas_interactive_cubes_ortho.js";
import { example as canvasInteractiveRaycastingPoints } from "./canvas/interaction/canvas_interactive_raycasting_points.js";
import { example as canvasLod } from "./canvas/interaction/canvas_lod.js";
import { example as canvasModifierCurve } from "./canvas/interaction/canvas_modifier_curve.js";
import { example as canvasModifierSimplifier } from "./canvas/interaction/canvas_modifier_simplifier.js";
import { example as canvasModifierSubdivision } from "./canvas/interaction/canvas_modifier_subdivision.js";
import { example as canvasModifierTessellation } from "./canvas/interaction/canvas_modifier_tessellation.js";
import { example as canvasMorphtargets } from "./canvas/interaction/canvas_morphtargets.js";
import { example as canvasMorphtargetsFace } from "./canvas/interaction/canvas_morphtargets_face.js";
import { example as canvasMorphtargetsHorse } from "./canvas/interaction/canvas_morphtargets_horse.js";
import { example as canvasMorphtargetsSphere } from "./canvas/interaction/canvas_morphtargets_sphere.js";
import { example as canvasMultipleElements } from "./canvas/interaction/canvas_multiple_elements.js";
import { example as canvasMultipleElementsText } from "./canvas/interaction/canvas_multiple_elements_text.js";
import { example as canvasMultipleScenesComparison } from "./canvas/interaction/canvas_multiple_scenes_comparison.js";
import { example as canvasMultipleViews } from "./canvas/interaction/canvas_multiple_views.js";
import { example as canvasLoaderBvh } from "./canvas/loader/canvas_loader_bvh.js";
import { example as canvasLoaderGcode } from "./canvas/loader/canvas_loader_gcode.js";
import { example as canvasLoaderGltf } from "./canvas/loader/canvas_loader_gltf.js";
import { example as canvasLoaderGltfInstancing } from "./canvas/loader/canvas_loader_gltf_instancing.js";
import { example as canvasLoaderGltfProgressiveLod } from "./canvas/loader/canvas_loader_gltf_progressive_lod.js";
import { example as canvasLoaderGltfVariants } from "./canvas/loader/canvas_loader_gltf_variants.js";
import { example as canvasLoaderImagebitmap } from "./canvas/loader/canvas_loader_imagebitmap.js";
import { example as canvasLoaderNrrd } from "./canvas/loader/canvas_loader_nrrd.js";
import { example as canvasLoaderObj } from "./canvas/loader/canvas_loader_obj.js";
import { example as canvasLoaderPcd } from "./canvas/loader/canvas_loader_pcd.js";
import { example as canvasLoaderPdb } from "./canvas/loader/canvas_loader_pdb.js";
import { example as canvasLoaderPly } from "./canvas/loader/canvas_loader_ply.js";
import { example as canvasLoaderStl } from "./canvas/loader/canvas_loader_stl.js";
import { example as canvasLoaderSvg } from "./canvas/loader/canvas_loader_svg.js";
import { example as canvasLoaderTextureDds } from "./canvas/loader/canvas_loader_texture_dds.js";
import { example as canvasLoaderTextureTga } from "./canvas/loader/canvas_loader_texture_tga.js";
import { example as canvasLoaderTtf } from "./canvas/loader/canvas_loader_ttf.js";
import { example as canvasLoaderVox } from "./canvas/loader/canvas_loader_vox.js";
import { example as canvasLoaderXyz } from "./canvas/loader/canvas_loader_xyz.js";
import { example as canvasLoader3dm } from "./canvas/loader/canvas_loader_3dm.js";
import { example as canvasLoader3ds } from "./canvas/loader/canvas_loader_3ds.js";
import { example as canvasLoader3dtiles } from "./canvas/loader/canvas_loader_3dtiles.js";
import { example as canvasLoader3mf } from "./canvas/loader/canvas_loader_3mf.js";
import { example as canvasLoader3mfMaterials } from "./canvas/loader/canvas_loader_3mf_materials.js";
import { example as canvasLoaderAmf } from "./canvas/loader/canvas_loader_amf.js";
import { example as canvasLoaderCollada } from "./canvas/loader/canvas_loader_collada.js";
import { example as canvasLoaderColladaKinematics } from "./canvas/loader/canvas_loader_collada_kinematics.js";
import { example as canvasLoaderColladaSkinning } from "./canvas/loader/canvas_loader_collada_skinning.js";
import { example as canvasLoaderDraco } from "./canvas/loader/canvas_loader_draco.js";
import { example as canvasLoaderFbx } from "./canvas/loader/canvas_loader_fbx.js";
import { example as canvasLoaderFbxNurbs } from "./canvas/loader/canvas_loader_fbx_nurbs.js";
import { example as canvasLoaderGltfAvif } from "./canvas/loader/canvas_loader_gltf_avif.js";
import { example as canvasLoaderGltfCompressed } from "./canvas/loader/canvas_loader_gltf_compressed.js";
import { example as canvasLoaderIfc } from "./canvas/loader/canvas_loader_ifc.js";
import { example as canvasLoaderKmz } from "./canvas/loader/canvas_loader_kmz.js";
import { example as canvasLoaderLdraw } from "./canvas/loader/canvas_loader_ldraw.js";
import { example as canvasLoaderMd2 } from "./canvas/loader/canvas_loader_md2.js";
import { example as canvasLoaderMd2Control } from "./canvas/loader/canvas_loader_md2_control.js";
import { example as canvasLoaderMdd } from "./canvas/loader/canvas_loader_mdd.js";
import { example as canvasLoaderTextureExr } from "./canvas/loader/canvas_loader_texture_exr.js";
import { example as canvasLoaderTextureHdr } from "./canvas/loader/canvas_loader_texture_hdr.js";
import { example as canvasLoaderTextureLottie } from "./canvas/loader/canvas_loader_texture_lottie.js";
import { example as canvasLoaderTextureUltrahdr } from "./canvas/loader/canvas_loader_texture_ultrahdr.js";
import { example as canvasLoaderUsdz } from "./canvas/loader/canvas_loader_usdz.js";
import { example as canvasLoaderVrml } from "./canvas/loader/canvas_loader_vrml.js";
import { example as canvasHelpersScene } from "./canvas/scene/canvas_helpers_scene.js";
import { example as canvasMaterialsVideo } from "./canvas/media/canvas_materials_video.js";
import { example as canvasMaterialsVideoWebcam } from "./canvas/media/canvas_materials_video_webcam.js";
import { example as canvasMaterialsVideoWebgpu } from "./canvas/media/canvas_materials_video_webgpu.js";
import { example as canvasMorphtargetsWebcam } from "./canvas/media/canvas_morphtargets_webcam.js";
import { example as canvasVideoFrame } from "./canvas/media/canvas_video_frame.js";
import { example as canvasVideoKinect } from "./canvas/media/canvas_video_kinect.js";
import { example as canvasVideoPanorama } from "./canvas/media/canvas_video_panorama.js";
import { example as canvasVideoPanoramaEquirectangular } from "./canvas/media/canvas_video_panorama_equirectangular.js";
import { example as canvasWorkerOffscreencanvas } from "./canvas/media/canvas_worker_offscreencanvas.js";
import { example as canvasGeometries } from "./canvas/scene/canvas_geometries.js";
import { example as canvasGeometryColors } from "./canvas/scene/canvas_geometry_colors.js";
import { example as canvasGeometryCube } from "./canvas/scene/canvas_geometry_cube.js";
import { example as canvasGeometryExtrudeShapes } from "./canvas/scene/canvas_geometry_extrude_shapes.js";
import { example as canvasGeometryShapes } from "./canvas/scene/canvas_geometry_shapes.js";
import { example as canvasLightsHemisphere } from "./canvas/scene/canvas_lights_hemisphere.js";
import { example as canvasMathObb } from "./canvas/scene/canvas_math_obb.js";
import { example as canvasPanoramaCube } from "./canvas/scene/canvas_panorama_cube.js";
import { example as canvasPanoramaEquirectangular } from "./canvas/scene/canvas_panorama_equirectangular.js";
import { example as canvasPointsBillboards } from "./canvas/scene/canvas_points_billboards.js";
import { example as canvasPointsDynamic } from "./canvas/scene/canvas_points_dynamic.js";
import { example as canvasPointsWaves } from "./canvas/scene/canvas_points_waves.js";
import { example as canvasRandomUv } from "./canvas/scene/canvas_random_uv.js";
import { example as canvasRaycasterBvh } from "./canvas/scene/canvas_raycaster_bvh.js";
import { example as canvasRaycasterSprite } from "./canvas/scene/canvas_raycaster_sprite.js";
import { example as canvasRaycasterTexture } from "./canvas/scene/canvas_raycaster_texture.js";
import { example as canvasShadowmesh } from "./canvas/scene/canvas_shadowmesh.js";
import { example as canvasSimpleGi } from "./canvas/scene/canvas_simple_gi.js";
import { example as canvasSprites } from "./canvas/scene/canvas_sprites.js";
import { example as css2dLabel } from "./css/css2d_label.js";
import { example as css3dMixed } from "./css/css3d_mixed.js";
import { example as css3dMolecules } from "./css/css3d_molecules.js";
import { example as css3dOrthographic } from "./css/css3d_orthographic.js";
import { example as css3dPeriodictable } from "./css/css3d_periodictable.js";
import { example as css3dSandbox } from "./css/css3d_sandbox.js";
import { example as css3dSprites } from "./css/css3d_sprites.js";
import { example as css3dYoutube } from "./css/css3d_youtube.js";
import { example as gamesFps } from "./games/games_fps.js";
import { example as animationGroups } from "./misc/misc_animation_groups.js";
import { example as animationKeys } from "./misc/misc_animation_keys.js";
import { example as boxSelection } from "./misc/misc_boxselection.js";
import { example as controlsArcball } from "./misc/misc_controls_arcball.js";
import { example as controlsDrag } from "./misc/misc_controls_drag.js";
import { example as controlsFly } from "./misc/misc_controls_fly.js";
import { example as controlsMap } from "./misc/misc_controls_map.js";
import { example as controlsOrbit } from "./misc/misc_controls_orbit.js";
import { example as controlsPointerlock } from "./misc/misc_controls_pointerlock.js";
import { example as controlsTrackball } from "./misc/misc_controls_trackball.js";
import { example as controlsTransform } from "./misc/misc_controls_transform.js";
import { example as exporterExr } from "./misc/misc_exporter_exr.js";
import { example as exporterDraco } from "./misc/misc_exporter_draco.js";
import { example as exporterUsdz } from "./misc/misc_exporter_usdz.js";
import { example as exporterGcode } from "./misc/misc_exporter_gcode.js";
import { example as exporterGltf } from "./misc/misc_exporter_gltf.js";
import { example as exporterGltfNormals } from "./misc/misc_exporter_gltf_normals.js";
import { example as exporterObj } from "./misc/misc_exporter_obj.js";
import { example as exporterPly } from "./misc/misc_exporter_ply.js";
import { example as exporterStl } from "./misc/misc_exporter_stl.js";
import { example as raycasterHelper } from "./misc/misc_raycaster_helper.js";
import { example as uvTests } from "./misc/misc_uv_tests.js";
import { example as canvasPhysicsAmmoBreak } from "./physics/canvas_physics_ammo_break.js";
import { example as canvasPhysicsAmmoCloth } from "./physics/canvas_physics_ammo_cloth.js";
import { example as canvasPhysicsAmmoInstancing } from "./physics/canvas_physics_ammo_instancing.js";
import { example as canvasPhysicsAmmoRope } from "./physics/canvas_physics_ammo_rope.js";
import { example as canvasPhysicsAmmoTerrain } from "./physics/canvas_physics_ammo_terrain.js";
import { example as canvasPhysicsAmmoVolume } from "./physics/canvas_physics_ammo_volume.js";
import { example as canvasPhysicsJoltInstancing } from "./physics/canvas_physics_jolt_instancing.js";
import { example as canvasPhysicsRapierBasic } from "./physics/canvas_physics_rapier_basic.js";
import { example as canvasPhysicsRapierCharacterController } from "./physics/canvas_physics_rapier_character_controller.js";
import { example as canvasPhysicsRapierInstancing } from "./physics/canvas_physics_rapier_instancing.js";
import { example as canvasPhysicsRapierJoints } from "./physics/canvas_physics_rapier_joints.js";
import { example as canvasPhysicsRapierTerrain } from "./physics/canvas_physics_rapier_terrain.js";
import { example as canvasPhysicsRapierVehicleController } from "./physics/canvas_physics_rapier_vehicle_controller.js";
import { example as svgLines } from "./svg/svg_lines.js";
import { example as svgSandbox } from "./svg/svg_sandbox.js";
import { example as webaudioOrientation } from "./webaudio/webaudio_orientation.js";
import { example as webaudioSandbox } from "./webaudio/webaudio_sandbox.js";
import { example as webaudioTiming } from "./webaudio/webaudio_timing.js";
import { example as webaudioVisualizer } from "./webaudio/webaudio_visualizer.js";
import { example as canvasLoaderGltfAnimationPointer } from "./canvas/loader/canvas_loader_gltf_animation_pointer.js";
import { example as canvasLoaderTextureTiff } from "./canvas/loader/canvas_loader_texture_tiff.js";
import { example as cameraAnaglyphStereoCpu } from "./camera2/camera_anaglyph_stereo_cpu.js";
import { example as cameraPerspectiveProjection } from "./camera2/perspective_projection.js";
import { example as arcballProjection } from "./camera2/arcball_projection.js";
import { example as arcballCompoundProjection } from "./camera2/arcball_compound_projection.js";
import { example as flyProjection } from "./camera2/fly_projection.js";
import { example as flyTurnProjection } from "./camera2/fly_turn_projection.js";
import { example as flySprintCompoundProjection } from "./camera2/fly_sprint_compound_projection.js";
import { example as sprintProjection } from "./camera2/sprint_projection.js";
import { example as sprintCompoundProjection } from "./camera2/sprint_compound_projection.js";
import { example as sprintTurnProjection } from "./camera2/sprint_turn_projection.js";
import { example as orbitCompoundProjection } from "./camera2/orbit_compound_projection.js";
import { example as orthoArcadeProjection } from "./camera2/ortho_arcade_projection.js";
import { example as focusProjection } from "./camera2/focus_projection.js";
import { example as focusCompoundProjection } from "./camera2/focus_compound_projection.js";
import { example as smoothProjection } from "./camera2/smooth_projection.js";
import { example as cineFocusProjection } from "./camera2/cine_focus_projection.js";
import { example as arcstepProjection } from "./camera2/arcstep_projection.js";
import { example as fastforwardProjection } from "./camera2/fastforward_projection.js";
import { example as persistProjection } from "./camera2/persist_projection.js";
import { example as hoistProjection } from "./camera2/hoist_projection.js";

export const categoryLabels = {
  misc: "Miscellaneous",
  canvas: "Canvas2D (adapted)",
  physics: "Physics (Canvas2D)",
  svg: "SVG (DOM)",
  webaudio: "WebAudio (Canvas2D)",
  css2d: "CSS2D (DOM)",
  css3d: "CSS3D (DOM)",
  games: "Games (Canvas2D)",
};

export const examples: ExampleModule[] = [
  animationGroups,
  animationKeys,
  controlsOrbit,
  controlsArcball,
  controlsDrag,
  controlsFly,
  controlsMap,
  controlsPointerlock,
  controlsTrackball,
  controlsTransform,
  raycasterHelper,
  boxSelection,
  uvTests,
  exporterObj,
  exporterGltf,
  exporterGltfNormals,
  exporterExr,
  exporterDraco,
  exporterUsdz,
  exporterGcode,
  exporterPly,
  exporterStl,
  webaudioOrientation,
  webaudioSandbox,
  webaudioTiming,
  webaudioVisualizer,
  css2dLabel,
  css3dMixed,
  css3dMolecules,
  css3dOrthographic,
  css3dPeriodictable,
  css3dSandbox,
  css3dSprites,
  css3dYoutube,
  gamesFps,
  canvasLoaderGltfAnimationPointer,
  canvasLoaderTextureTiff,
  cameraPerspectiveProjection,
  cameraAnaglyphStereoCpu,
  arcballProjection,
  arcballCompoundProjection,
  flyProjection,
  flyTurnProjection,
  flySprintCompoundProjection,
  sprintProjection,
  sprintCompoundProjection,
  sprintTurnProjection,
  orbitCompoundProjection,
  orthoArcadeProjection,
  focusProjection,
  focusCompoundProjection,
  smoothProjection,
  cineFocusProjection,
  arcstepProjection,
  fastforwardProjection,
  persistProjection,
  hoistProjection,
  canvasPhysicsRapierBasic,
  canvasPhysicsRapierCharacterController,
  canvasPhysicsRapierInstancing,
  canvasPhysicsRapierJoints,
  canvasPhysicsRapierTerrain,
  canvasPhysicsRapierVehicleController,
  canvasPhysicsAmmoInstancing,
  canvasPhysicsAmmoTerrain,
  canvasPhysicsAmmoBreak,
  canvasPhysicsAmmoCloth,
  canvasPhysicsAmmoRope,
  canvasPhysicsAmmoVolume,
  canvasPhysicsJoltInstancing,
  canvasAnimationKeyframes,
  canvasAnimationMultiple,
  canvasAnimationSkinningAdditiveBlending,
  canvasAnimationSkinningBlending,
  canvasAnimationSkinningIk,
  canvasAnimationSkinningMorph,
  canvasAnimationWalk,
  canvasBuffergeometry,
  canvasBuffergeometryIndexed,
  canvasBuffergeometryLines,
  canvasBuffergeometryLinesIndexed,
  canvasCamera,
  canvasWebgpuCamera,
  canvasMaterialsVideo,
  canvasMaterialsVideoWebcam,
  canvasMaterialsVideoWebgpu,
  canvasMorphtargetsWebcam,
  canvasVideoFrame,
  canvasVideoKinect,
  canvasVideoPanorama,
  canvasVideoPanoramaEquirectangular,
  canvasWorkerOffscreencanvas,
  canvasLinesColors,
  canvasLoaderObj,
  canvasLoaderGltf,
  canvasLoaderGltfInstancing,
  canvasLoaderGltfProgressiveLod,
  canvasLoaderGltfVariants,
  canvasLoaderBvh,
  canvasLoaderTextureDds,
  canvasLoaderImagebitmap,
  canvasLoaderNrrd,
  canvasLoaderTextureTga,
  canvasLoaderTtf,
  canvasLoaderVox,
  canvasLoaderGcode,
  canvasLoaderPdb,
  canvasLoaderPly,
  canvasLoaderPcd,
  canvasLoaderStl,
  canvasLoaderXyz,
  canvasLoaderSvg,
  canvasLoader3dm,
  canvasLoader3ds,
  canvasLoader3dtiles,
  canvasLoader3mf,
  canvasLoader3mfMaterials,
  canvasLoaderAmf,
  canvasLoaderCollada,
  canvasLoaderColladaKinematics,
  canvasLoaderColladaSkinning,
  canvasLoaderDraco,
  canvasLoaderFbx,
  canvasLoaderFbxNurbs,
  canvasLoaderGltfAvif,
  canvasLoaderGltfCompressed,
  canvasLoaderIfc,
  canvasLoaderKmz,
  canvasLoaderLdraw,
  canvasLoaderMd2,
  canvasLoaderMd2Control,
  canvasLoaderMdd,
  canvasLoaderTextureExr,
  canvasLoaderTextureHdr,
  canvasLoaderTextureLottie,
  canvasLoaderTextureUltrahdr,
  canvasLoaderUsdz,
  canvasLoaderVrml,
  canvasHelpersScene,
  canvasBatchLodBvh,
  canvasBuffergeometryAttributesInteger,
  canvasBuffergeometryAttributesNone,
  canvasBuffergeometryDrawrange,
  canvasBuffergeometryInstancing,
  canvasBuffergeometryInstancingInterleaved,
  canvasBuffergeometrySelectiveDraw,
  canvasGeometryConvex,
  canvasGeometryExtrudeSplines,
  canvasGeometryMinecraft,
  canvasGeometryNurbs,
  canvasGeometrySplineEditor,
  canvasGeometryTeapot,
  canvasGeometryTerrain,
  canvasGeometryTerrainRaycast,
  canvasGeometryText,
  canvasGeometryTextShapes,
  canvasGeometryTextStroke,
  canvasMarchingcubes,
  canvasInstancingDynamic,
  canvasInstancingRaycast,
  canvasInteractiveBuffergeometry,
  canvasInteractiveCubes,
  canvasInteractiveCubesOrtho,
  canvasInteractiveRaycastingPoints,
  canvasLod,
  canvasModifierCurve,
  canvasModifierSimplifier,
  canvasModifierSubdivision,
  canvasModifierTessellation,
  canvasMorphtargets,
  canvasMorphtargetsFace,
  canvasMorphtargetsHorse,
  canvasMorphtargetsSphere,
  canvasMultipleElements,
  canvasMultipleElementsText,
  canvasMultipleScenesComparison,
  canvasMultipleViews,
  canvasGeometries,
  canvasGeometryColors,
  canvasGeometryCube,
  canvasGeometryExtrudeShapes,
  canvasGeometryShapes,
  canvasLightsHemisphere,
  canvasMathObb,
  canvasPanoramaCube,
  canvasPanoramaEquirectangular,
  canvasPointsBillboards,
  canvasPointsDynamic,
  canvasPointsWaves,
  canvasRandomUv,
  canvasRaycasterBvh,
  canvasRaycasterSprite,
  canvasRaycasterTexture,
  canvasShadowmesh,
  canvasSimpleGi,
  canvasSprites,
  svgLines,
  svgSandbox,
];
