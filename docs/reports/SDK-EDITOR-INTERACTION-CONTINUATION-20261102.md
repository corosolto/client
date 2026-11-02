# SDK editor: input and flag identity

Native whole review R1879 N06/N08 confirmed two introduced SDK inconsistencies. Right/extra buttons created objects or began selection drag; CTF identifiers based on length repeated after deletion and left the alphabet after 26. R1914 actual extended existing checker returned RED with exactly six clauses before the HTML fix.

Primary click creates/selects and middle click pans as before. Other buttons now return before editing. New flags choose the first unused alphabetic identifier, continuing A..Z,AA..; existing IDs are preserved.

R1915 nominal ten focused clauses pass; in-memory restoration of the original button handling fails exactly four clauses, and restoration of length-derived IDs fails exactly two. The complete existing construtor-input checker passes in1.709s. Reports EDITOR-{REAL-RED-R1914.log,CAUSAL-R1915.json,FOCUSED-R1915.json} are saved in the project audit directory. No raster, Ego or gameplay acceptance is implied; the actual browser path remains pending.
