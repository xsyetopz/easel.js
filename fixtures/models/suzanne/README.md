# Suzanne OBJ fixture

`Suzanne.obj` is a Wavefront OBJ conversion of the Suzanne model from
[Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/723ffc6706725b618b8c14ceb82e3e6904b08a76/Models/Suzanne).
It provides a canonical interchange-format fixture for loader integration tests.

- Original model: copyright 2017 UX3D; Norbert Nopper
- Original asset license: CC0-1.0
- Source revision: `723ffc6706725b618b8c14ceb82e3e6904b08a76`
- Original binary SHA-256: `b85c2727aa41318e00673d8892f5879d46fb6e476e280f28ee1febd07602b6b8`
- Converted OBJ SHA-256: `1cd8a40060f481382c2ef92511594c2050c778daa7c56f40b1fdd2adb8e4f0aa`

The conversion reads the glTF position, normal, UV, and triangle-index
accessors, merges identical vertex tuples, and writes six-decimal OBJ records.
The OBJ contains positions, normals, UVs, triangles, and one material group.
Textures are not included. See `LICENSE.md` for the asset license notice.
