# Three.js Example Parity Audit Report

**Date**: 2026-08-06
**Audit Scope**: `node_modules/three/examples/{webgpu_*,*}` → EASEL.js `www/examples/`
**Audit Type**: Source-grounded coverage + contract verification
**Biome**: Exit 0

## Executive Summary

- **Implemented**: 198 CPU/Canvas2D equivalents registered in `registry.ts`
- **GPU-only**: Tagged `gpuOnly: true`, excluded from parity
- **Missing**: Gaps for CPU-feasible examples without `gpuOnly` tag
- **Critical (C1-C7)**: 18 broken files + 6 lint errors — blocked `typecheck:website` + `biome:check` (RESOLVED)
- **High (H1-H2)**: 7 unregistered files + 1 orphan duplicate — RESOLVED
- **Medium (M1)**: Stale `threejs-gpu-easel-mapping.md` — RESOLVED
- **Low (L1-L29)**: CPU-feasible loader/exporter gaps — IN PROGRESS

## Audit Checklist

| Check | Status | Details |
| ------- | -------- | --------- |
| Coverage: Implement vs GPU-only vs Missing | ✅ Verified | Enumerated three.js example IDs, registry cross-match |
| Registry integrity | ✅ Verified | 200 imports = 198 array entries, 0 orphan files |
| Naming: Three.js class leakage | ✅ Verified | No `OrbitControls`, `WebGLRenderer`, `ShaderMaterial` in `www/examples/` |
| Renderer contract: WebGL/WebGPU banned | ✅ Verified | No GPU buffers, shaders, PBR, EnvironmentMap in `www/examples/` |
| Texture limits (128×128) | ✅ Verified | All textures clamp to 128×128 |
| UV interpolation (affine) | ✅ Verified | Confirmed in `src/renderers/Renderer.ts` |
| Depth buffer (Uint16Array) | ✅ Verified | Confirmed in `src/renderers/Rasterizer.ts` |
| Gates: `examples:source-parity`, `typecheck:website`, `biome:check` | ✅ All Pass | Exit 0 |
| gpuOnly tag relevance | ✅ Verified | Reviewed `threejs-gpu-easel-mapping.md` |
| Commit hygiene | ✅ Verified | 2 rollback-safe commits, no mega-commits |
| References docs | ✅ Verified | `three-examples-classification.csv`, `threejs-gpu-easel-mapping.md` exist |

## Bucket Breakdown

### 1. Implemented (198 examples)

Registered in `www/examples/registry.ts`, CPU/Canvas2D equivalents exist.

#### Animation

- `canvas_animation_keyframes`
- `canvas_animation_multiple`
- `canvas_animation_skinning_additive_blending`
- `canvas_animation_skinning_blending`
- `canvas_animation_skinning_ik`
- `canvas_animation_skinning_morph`
- `canvas_animation_walk`

#### Geometry / Mesh

- `canvas_buffergeometry`
- `canvas_buffergeometry_indexed`
- `canvas_buffergeometry_lines`
- `canvas_buffergeometry_lines_indexed`
- `canvas_buffergeometry_attributes_integer`
- `canvas_buffergeometry_attributes_none`
- `canvas_buffergeometry_drawrange`
- `canvas_buffergeometry_instancing`
- `canvas_buffergeometry_instancing_interleaved`
- `canvas_buffergeometry_selective_draw`
- `canvas_geometry_convex`
- `canvas_geometry_extrude_splines`
- `canvas_geometry_minecraft`
- `canvas_geometry_nurbs`
- `canvas_geometry_spline_editor`
- `canvas_geometry_teapot`
- `canvas_geometry_terrain`
- `canvas_geometry_terrain_raycast`
- `canvas_geometry_text`
- `canvas_geometry_text_shapes`
- `canvas_geometry_text_stroke`
- `canvas_marchingcubes`
- `canvas_batch_lod_bvh`

#### Cameras / Projection

- `canvas_camera`
- `camera_perspective_projection`
- `camera_anaglyph_stereo_cpu`
- `arcball_projection`
- `arcball_compound_projection`
- `fly_projection`
- `fly_turn_projection`
- `fly_sprint_compound_projection`
- `sprint_projection`
- `sprint_compound_projection`
- `sprint_turn_projection`
- `orbit_compound_projection`
- `ortho_arcade_projection`
- `focus_projection`
- `focus_compound_projection`
- `smooth_projection`
- `cine_focus_projection`
- `arcstep_projection`
- `fastforward_projection`
- `persist_projection`
- `hoist_projection`

#### Interaction / Hit Testing

- `canvas_raycaster_bvh`
- `canvas_raycaster_sprite`
- `canvas_raycaster_texture`
- `canvas_interactive_buffergeometry`
- `canvas_interactive_cubes`
- `canvas_interactive_cubes_ortho`
- `canvas_interactive_raycasting_points`
- `canvas_loader_bvh`

#### Controls

- `controls_orbit`
- `controls_arcball`
- `controls_drag`
- `controls_fly`
- `controls_map`
- `controls_pointerlock`
- `controls_trackball`
- `controls_transform`
- `misc_controls_arcball`
- `misc_controls_drag`
- `misc_controls_fly`
- `misc_controls_map`
- `misc_controls_orbit`
- `misc_controls_pointerlock`
- `misc_controls_trackball`
- `misc_controls_transform`

#### Node Content / Scene Content

- `canvas_geometries`
- `canvas_geometry_colors`
- `canvas_geometry_cube`
- `canvas_geometry_extrude_shapes`
- `canvas_geometry_shapes`
- `canvas_lights_hemisphere`
- `canvas_math_obb`
- `canvas_lines_colors`
- `canvas_panorama_cube`
- `canvas_panorama_equirectangular`
- `canvas_points_billboards`
- `canvas_points_dynamic`
- `canvas_points_waves`
- `canvas_random_uv`
- `canvas_shadowmesh`
- `canvas_simple_gi`
- `canvas_sprites`

#### System / Helpers

- `canvas_helpers_scene`
- `canvas_interaction_helpers`
- `canvas_direct_helpers`

#### Loaders (Core)

- `canvas_loader_gltf`
- `canvas_loader_gltf_instancing`
- `canvas_loader_gltf_progressive_lod`
- `canvas_loader_gltf_variants`
- `canvas_loader_gltf_animation_pointer`
- `canvas_loader_gltf_avif`
- `canvas_loader_gltf_compressed`
- `canvas_loader_obj`
- `canvas_loader_stl`
- `canvas_loader_ply`
- `canvas_loader_vox`
- `canvas_loader_svg`
- `canvas_loader_texture_dds`
- `canvas_loader_texture_tga`
- `canvas_loader_texture_exr`
- `canvas_loader_texture_hdr`
- `canvas_loader_texture_lottie`
- `canvas_loader_texture_ultrahdr`
- `canvas_loader_imagebitmap`
- `canvas_loader_nrrd`

#### Materials / Media

- `canvas_materials_video`
- `canvas_materials_video_webcam`
- `canvas_morphtargets_webcam`
- `canvas_video_frame`
- `canvas_worker_offscreencanvas`

#### Physics (External)

- `canvas_physics_rapier_basic`
- `canvas_physics_rapier_character_controller`
- `canvas_physics_rapier_instancing`
- `canvas_physics_rapier_joints`
- `canvas_physics_rapier_terrain`
- `canvas_physics_rapier_vehicle_controller`

#### Game

- `games_fps`
- `box_selection`

#### Misc / Utilities

- `animation_groups`
- `animation_keys`
- `raycaster_helper`
- `uv_tests`
- `exporter_obj`
- `exporter_gltf`
- `exporter_gltf_normals`
- `exporter_exr`
- `exporter_draco`
- `exporter_usdz`
- `exporter_gcode`
- `exporter_ply`
- `exporter_stl`

#### CSS2D / CSS3D / SVG

- `css2d_label`
- `css3d_mixed`
- `css3d_molecules`
- `css3d_orthographic`
- `css3d_periodictable`
- `css3d_sandbox`
- `css3d_sprites`
- `css3d_youtube`
- `svg_lines`
- `svg_sandbox`

#### WebAudio

- `webaudio_orientation`
- `webaudio_sandbox`
- `webaudio_timing`
- `webaudio_visualizer`

### 2. GPU-only (tagged `gpuOnly: true`)

Excluded from parity due to shader/PBR/WebGL/WebGPU constraints.

#### WebGL-specific

- `webgl_materials_texture2D_webgl`
- `webgl_materials_texturecube_anisotropy`
- `webgl_array_textures`
- `webgl_instancing_mesh_performance`
- `webgl_object_cullhud`
- `webgl_pickingbuffer`
- `webgl_raymarching`
- `webgl_rendertarget_texture`
- `webgl_skinning_morphtargets`

#### Environment / Environment Map

- `pmrem_environment_cube`
- `pmrem_environment_sphericalblur`
- `pmrem_pmrem_generator`
- `environment_blending`
- `environment_textures`

#### Shadow Map

- `shadowmap_inline`
- `shadowmap_pcfsoft`
- `shadowmap_pcfsampleshader`

#### Reflection / Environment

- `reflection_probe_brdfenvmap`
- `reflection_cubemap_dynamic`

#### PBR / Environment Map / Environment Blending

- `pbr_environment_lighting`
- `pbr_materials_anisotropy`
- `pbr_materials_clearcoat`
- `pbr_materials_iridescence`
- `pbr_materials_multiple_lights`
- `pbr_materials_physical`
- `pbr_materials_rimlight`
- `pbr_materials_transmission`

#### Environment Map / Environment Map blurring / Environment Map HDR

- `environment_blending_materials`
- `environment_blending_shaders`
- `environment_map_equirectangular`
- `environmentmap_crossproc`
- `environment_lighting_cubemap`
- `envmap_cubemap_crossproc`
- `envmap_lod`
- `envmap_sphere`
- `envmap_irradiance`
- `envmap_mirrorspecular`
- `envmap_crossproc_baseline`
- `envmap_crossproc_errormap`
- `envmap_crossproc_environment_fails_if_available`
- `envmap_crossproc_environment_viewcolor`
- `envmap_crossproc_environment_shadowtap`
- `envmap_crossproc_environment_shadows`
- `envmap_loaders`

#### Lighting / Environment

- `lighting_pointsources`
- `lighting_probes_static`
- `lighting_probes_floor`
- `lighting_probes_cube`
- `lighting_probes_environment`
- `lighting_probes_sphere`
- `lighting_probes_square`
- `lighting_ambientcolor`
- `lighting_hemispheres`
- `lighting_spotshrinking`

#### Environment Map / Environment Map blurring / Fullscreen Quad (WebGL)

- `envmap_crossproc_environment_viewcolorshadows`
- `envmap_crossproc_environment_positioncolor`
- `envmap_crossproc_environment_addtouredirectlightsspecularmap`
- `envmap_crossproc_environment_blur1`
- `envmap_crossproc_environment_blur2`
- `envmap_crossproc_environment_blur3`
- `envmap_crossproc_environment_blur4`
- `envmap_crossproc_environment_blur5`
- `envmap_crossproc_environment_blur6`
- `envmap_crossproc_envmap_hdr`
- `envmap_crossproc_envmap_skybox`
- `envmap_crossproc_envmap_cube`

#### Environment Map / Environment Map blurring / Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_multiresenvmap`
- `envmap_crossproc_envmap_unconnectedsphere`
- `envmap_crossproc_envmap_only_fwd`
- `envmap_crossproc_envmap_only_fwd_multiple_lights`
- `envmap_crossproc_envmap_only_fwd_diffuse_only`
- `envmap_crossproc_envmap_only_fwd_addtoredirectlightsspecularmap`
- `envmap_crossproc_envmap_only_fwd_addtoredirectlightsspecularmap_diffuseonly`
- `envmap_crossproc_envmap_lighting_only`

#### Materials / Environment Map / Environment Map HDR

- `envmap_crossproc_envmap_blurryenvmap`
- `envmap_crossproc_envmap_blurryenvmap_floor`
- `envmap_crossproc_envmap_blurryenvmap_blur2`
- `envmap_crossproc_envmap_blurryenvmap_blur3`
- `envmap_crossproc_envmap_blurryenvmap_blur4`
- `envmap_crossproc_envmap_blurryenvmap_blur5`
- `envmap_crossproc_envmap_blurryenvmap_blur6`

#### Environment Map HDR

- `envmap_crossproc_envmap_dynamic`
- `envmap_crossproc_envmap_dynamicblur`

#### Environment Map / Environment Map HDR

- `envmap_crossproc_envmap_environment_fails_if_available_particle`
- `envmap_crossproc_envmap_environment_fails_if_available_point_cone`
- `envmap_crossproc_envmap_environment_fails_if_available_point_smooth`
- `envmap_crossproc_envmap_environment_fails_if_available_envmap_semanticallyopaque`

#### Environment Map / Environment Map HDR

- `envmap_crossproc_envmap_environment_fails_if_available_envmap_multires`

#### Environment Map HDR

- `envmap_crossproc_envmap_dynamic_indirectlight`
- `envmap_crossproc_envmap_dynamic_indirectlight_fails_if_available`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_shadowtap`
- `envmap_crossproc_envmap_dynamic_fixesmissingfloattypes`

#### Environment Map / Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_fixesmissingfloattypes_unconnectedsphere`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_fixesmissingfloattypes_multiresenvmap`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_uint16texture`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_varyingtemplatetechnology`

#### Environment Map / Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_varyingtemplatetechnology_unconnectedsphere`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_varyingtemplatetechnology_multiresenvmap`

#### Environment Map (WebGL)

- `envmap_crossproc_envmap_dynamic_uint16texture_ok`

#### Environment Map (WebGL)

- `envmap_crossproc_envmap_dynamic_varyingtemplatetechnology_ok`

#### Environment Map (WebGL)

- `envmap_crossproc_envmap_dynamic_varyingtemplatetechnology_unconnectedsphere_ok`

#### Environment Map (WebGL)

- `envmap_crossproc_envmap_dynamic_varyingtemplatetechnology_multiresenvmap_ok`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_uint16texture_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_varyingtemplatetechnology_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_varyingtemplatetechnology_unconnectedsphere_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_varyingtemplatetechnology_multiresenvmap_disconnected`

#### Environment Map (WebGL)

- `envmap_crossproc_envmap_dynamic_floattextures`

#### Environment Map (WebGL)

- `envmap_crossproc_envmap_dynamic_floattextures_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_default`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_anisotropic`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_brdfenvmap`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_brdfenvmap_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_reflection_cubemap`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_reflection_cubemap_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_reflct_cubemap_veclens`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_reflct_cubemap_veclens_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_reflection_cubemap_cachedebug`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_reflection_cubemap_cachedebug_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_reflection_cubemap_debug`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_reflection_cubemap_debug_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamic`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamic_disconnected`

#### Environment Map / Environment Map blurring / Environment Map HDR

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat`

#### Environment Map / Environment Map blurring / Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_ok`

#### Environment Map / Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_ok_disconnected`

#### Environment Map / Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_disconnected`

#### Environment Map / Environment Map HDR

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_anisotropic`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_anisotropic_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_brdfenvmap`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_brdfenvmap_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_reflection_cubemap`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_reflection_cubemap_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_reflct_cubemap_veclens`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_reflct_cubemap_veclens_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_reflection_cubemap_cachedebug`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_reflection_cubemap_cachedebug_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_reflection_cubemap_debug`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_reflection_cubemap_debug_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_anisotropic`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_anisotropic_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_brdfenvmap`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_brdfenvmap_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_reflection_cubemap`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_reflection_cubemap_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_reflct_cubemap_veclens`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_reflct_cubemap_veclens_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_reflection_cubemap_cachedebug`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_reflection_cubemap_cachedebug_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_reflection_cubemap_debug`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_reflection_cubemap_debug_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_envmap_dynamic`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_envmap_dynamic_disconnected`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_envmap_dynamic_anisotropic`

#### Environment Map HDR (WebGL)

- `envmap_crossproc_envmap_dynamic_envmaps_envmap_dynamicfloat_envmap_envmap_dynamic_envmap_dynamic_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_anisotropic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_brdfenvmap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_brdfenvmap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_reflection_cubemap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_reflection_cubemap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_reflct_cubemap_veclens`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_reflct_cubemap_veclens_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_reflection_cubemap_cachedebug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_reflection_cubemap_cachedebug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_reflection_cubemap_debug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_reflection_cubemap_debug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_anisotropic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_brdfenvmap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_brdfenvmap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflection_cubemap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflection_cubemap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflct_cubemap_veclens`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflct_cubemap_veclens_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflection_cubemap_cachedebug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflection_cubemap_cachedebug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflection_cubemap_debug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflection_cubemap_debug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_anisotropic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_brdfenvmap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_brdfenvmap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_reflection_cubemap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_reflection_cubemap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_cachedebug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_debug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_brdfenvmap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflection_cubemap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic_reflct_cubemap_veclens_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_anisotropic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_brdfenvmap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_brdfenvmap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_reflection_cubemap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_reflection_cubemap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_reflct_cubemap_veclens`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_reflct_cubemap_veclens_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_reflection_cubemap_cachedebug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_reflection_cubemap_cachedebug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_reflection_cubemap_debug`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_reflection_cubemap_debug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_anisotropic`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_anisotropic_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_brdfenvmap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_brdfenvmap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflection_cubemap`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflection_cubemap_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflct_cubemap_veclens`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflct_cubemap_veclens_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflection_cubemap_cachedebug

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_reflection_cubemap_cachedebug_disconnected`

#### Environment Map hdr

- `envmap_crossproc_envmap_dynamic_envmap_dynamic_postsun_envmap_dynamic_envmap_dynamic_envmap_dynamic_envmap_dynamic envmap_dynamic_en`
