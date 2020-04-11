#!/bin/bash
for a in *.obj ; {
  ../node_modules/.bin/obj2gltf -i "$a" -o "${a/.obj/.gltf}"
}
