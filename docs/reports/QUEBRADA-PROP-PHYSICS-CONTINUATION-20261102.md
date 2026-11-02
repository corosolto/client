# Quebrada optional prop physics

Native R1879 N05 identified physical cover disappearing when an optional GLB loaded. R1928 reproduced the actual builder: fallback has 498 colliders, all affected templates loaded had 441, and dumpsters alone reduced the count to 492. Twelve prop types failed independently; the existing speaker path served as a passing negative control. R1927 attempted the wrong world field and was refused as infrastructure evidence.

The builder now emits the same fallback physical proxies when the visual GLB is available. Box proxies, three grandstand steps and twelve rotated tent cells preserve their original dimensions and order. Visible GLB meshes remain bullet occluders; no invisible proxy is added as an occluder. Spawn, CTF and navigation contracts remain independent of asset availability.

The runtime test loads each of thirteen actual registered synthetic templates separately and together, verifies their presence in the scene and compares complete collider, waypoint, spawn and CTF hashes to the unloaded baseline. R1931 nominal passed. R1933 also passed two causal source regressions: removing box proxies or tent cells each produces the expected AssertionError. Timeouts, import errors and warnings receive no causal credit. The first R1930 edit guard refused before writing, so its following old-source failure is not an AFTER proof.

R1936 focused checks passed: visual-map-contracts (34.201s, including this nominal and both causal tests), mapcontrato (4.732s), campinho-integration (1.721s), syntax (4.732s). The new tests are attached to the existing visual-map-contracts deploy alias. No threshold, count oracle, navigation graph or shot-occlusion policy was relaxed.

Actual Ego gameplay, visible proxy-to-model fit, mobile, multiplayer and independent review of this final change remain pending. These checks establish physical consistency, not visual acceptance or release readiness.
