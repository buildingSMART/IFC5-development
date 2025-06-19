# IFC5 Viewer

This directory contains the code for the ifc5 viewer, as well as the code that is deployed to the buildingsmart url.

# Local viewing

Running `npm run serve` will allow you to use the viewer locally, as the `index.html` and its dependency `render.mjs` are checked in to the repo.

# Local development

Local development works as follows:
1. Install [nodejs](https://nodejs.org/en) if you haven't already 
2. open command prompt with this folder as a working directory
3. run `npm install`
4. Modify the typescript source files (`.ts`) as desired (*do not modify the render.mjs file directly*)
5. run `npm test` to run tests
6. run `npm build-viewer` to update the `render.mjs` file which is used by the viewer.
7. run `npm run serve` to visit the viewer, the host and port will be pasted in the cli output. You can keep this running while editing the viewer.