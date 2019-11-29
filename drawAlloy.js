'use strict'
var orbitcontrols, camera, scene, renderer, centreAlloyMesh, lastFrameTime;

//handy vars for rotation and translation on axes
var x = new THREE.Vector3(1, 0, 0);
var y = new THREE.Vector3(0, 1, 0);
var z = new THREE.Vector3(0, 0, 1);

//duplicates a mesh and rotates it on world axis a selected number of times over a degree range add all to scene
function dupAndRotate(meshToDup, totalRads, numMesh)
{
  var degreeRotatedMeshPoints = 0;
  var radiansBetweenSpokes = totalRads / numMesh;
  var allMeshReferences = []
  do
  {
    allMeshReferences.push(meshToDup);
    meshToDup = meshToDup.clone();
    meshToDup.rotateOnWorldAxis(z, radiansBetweenSpokes);
    degreeRotatedMeshPoints += radiansBetweenSpokes;
  } while(degreeRotatedMeshPoints < totalRads)

  return allMeshReferences;
}

function addMeshToObject(meshParent, childArray)
{
  for(var i = 0; i < childArray.length; i++)
  {
    meshParent.add(childArray[i]);
  }
}

function circleTo(shape, centrePoint, startPoint, radians, fidelity)
{
  var lastPoint = startPoint;
  for(var i = 0; i <= fidelity; i++)
  {
    var radianDistRotation = i/fidelity * radians;
    var newX = centrePoint[0]+(lastPoint[0]-centrePoint[0])*Math.cos(radianDistRotation)- (lastPoint[1]-centrePoint[1])*Math.sin(radianDistRotation);
    var newY = centrePoint[1]+(lastPoint[0]-centrePoint[0])*Math.sin(radianDistRotation)+ (lastPoint[1]-centrePoint[1])*Math.cos(radianDistRotation);
    shape.lineTo(newX, newY);
  }
  console.log("AFTER CIRCLE TO", lastPoint);
}

function draw()
{
  // create renderer attached to HTML Canvas object
  var c = document.getElementById("canvas");
  renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });

  // create the scenegraph 
  scene = new THREE.Scene();

  // adding axes for awareness
  var axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // create a camera
  var fov = 75;
  var aspect = 600/600;
  var near = 0.1;
  var far = 1000;
  camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
  camera.position.set(0, 0, 40);
  var axis = new THREE.Vector3( 0, 1, 0 ).normalize();

  orbitcontrols = new THREE.OrbitControls (camera, c);
  orbitcontrols.enableDamping = true;
  orbitcontrols.dampingFactor = 0.25;
  orbitcontrols.enableZoom = true;
  orbitcontrols.autoRotate = false;

  // add a light to the scene
  var spotLight = new THREE.SpotLight(0xFFFFFF);
  spotLight.position.set( 0, 0, 60 );
  scene.add(spotLight);

  var light = new THREE.PointLight(0xFFFFFF);
  light.position.set(0, 0, -5);
  scene.add(light);
  
  light = new THREE.PointLight(0xFFFFFF);
  light.position.set(10, -10, -5);
  scene.add(light);
  
  light = new THREE.PointLight(0xFFFFFF);
  light.position.set(-35, 35, 10);
  scene.add(light);

  light = new THREE.PointLight(0xFFFFFF);
  light.position.set(40, 40, -10);
  scene.add(light);

  //materials to use
  var greyPaintMat = new THREE.MeshPhongMaterial({color: 0x404040, specular: 0x050505, shininess: 80});
  var shinySurface = new THREE.MeshStandardMaterial({emissive: 0x999999, metalness: 1, roughness:.25});
  var tireMat = new THREE.MeshLambertMaterial({color: 0x222222});

  //centre nest coord for rotation
  centreAlloyMesh = new THREE.Object3D();
  centreAlloyMesh.position.set(0,0,0);

  var innerAlloyDiameterCurve = new THREE.Curve();
  innerAlloyDiameterCurve.getPoint = function (t)
  {
    var segment = (-2 * Math.PI) * t;
    return new THREE.Vector3(20 * Math.cos(segment), 20 * Math.sin(segment), 0);
  };

  var alloyRadExtrusionSettings = {
    steps: 40, extrudePath: innerAlloyDiameterCurve, isClosed: true
  };
  
  //make inner alloy shape
  var meshInnerAlloy = makeInnerAlloyExtrusion(alloyRadExtrusionSettings, greyPaintMat);
  centreAlloyMesh.add(meshInnerAlloy);

  //rim edge front and back
  var meshAlloyRimFront = makeRimEdge(alloyRadExtrusionSettings, shinySurface);
  var meshAlloyRimBack = meshAlloyRimFront.clone();
  meshAlloyRimBack.translateOnAxis(z, -21);

  //symmetric don't need to rotate for animation (wasted computation)
  scene.add(meshAlloyRimFront);
  scene.add(meshAlloyRimBack);
  
  //sharp "fin" on inside of front silver edge on each arm
  var alloyNibMesh = extrudeSharpArmNib(shinySurface);
  addMeshToObject(centreAlloyMesh, alloyNibMesh);

  //alloy arms
  var alloyArms = extrudeAlloyArms(greyPaintMat);
  addMeshToObject(centreAlloyMesh, alloyArms);

  //centre bore/wheel nut faceplate to set
  var extrudeCentreBoreMesh = extrudeCentreBore(greyPaintMat);
  centreAlloyMesh.add(extrudeCentreBoreMesh);

  //add tire black lambert for rubber
  var tireMesh = extrudeTireProfile(alloyRadExtrusionSettings, tireMat);
  scene.add(tireMesh);

  //adding logo to centre bore face
  var audiLogoCircles = drawAudiLogoCircles();
  addMeshToObject(centreAlloyMesh, audiLogoCircles);

  //Adding nested mesh to scene
  scene.add(centreAlloyMesh)

  // render the scene as seen by the camera
  renderer.render(scene, camera);

  animate();
}

function drawAudiLogoCircles()
{
  //function for making circle of diameter 1 t ranges from 0 to 1 defining
  //how far along the circle each point is in 3d space
  var audiCurvePointFunction = function (t) {
    var segment = -2 * Math.PI * t;
    return new THREE.Vector3(.5 * Math.cos(segment), .5 * Math.sin(segment), 0);
  };

  var t = 0.0;
  var tInc = 1 / 10;
  var audiHaloPoints = [];
  while (t <= 1)
  {
    audiHaloPoints.push(audiCurvePointFunction(t));
    t += tInc;
  }

  var geometry = new THREE.BufferGeometry().setFromPoints(audiHaloPoints);
  var material = new THREE.LineBasicMaterial({ color: 0x000000 });
  var audiLogoCircle = new THREE.Line(geometry, material);
  
  //half the distance between the centre of the 4 circles
  audiLogoCircle.translateOnAxis(x, -1.125);
  //face of centre bore of alloy
  audiLogoCircle.translateOnAxis(z, -4.5);
  
  var audiCircleLines = [];

  for (var i = 0; i < 4; i++) {
    audiCircleLines.push(audiLogoCircle);
    audiLogoCircle = audiLogoCircle.clone();
    audiLogoCircle.translateOnAxis(x, .75);
  }
  return audiCircleLines;
}

function extrudeCentreBore(greyPaintMat)
{
  var centreBoreShape = new THREE.Shape();
  centreBoreShape.moveTo(0, -7);
  circleTo(centreBoreShape, [0, 0], [0, -7], Math.PI * 2, 5);
  var centreBoreExtrusionSettings = { depth: 3, steps: 1, bevelEnabled: true, bevelSegments: 2, bevelOffset: 0, bevelThickness: 1, bevelSize: 1 };
  var extrudeCentreBore = new THREE.ExtrudeGeometry(centreBoreShape, centreBoreExtrusionSettings);
  var extrudeCentreBoreMesh = new THREE.Mesh(extrudeCentreBore, greyPaintMat);
  extrudeCentreBoreMesh.translateOnAxis(z, -8.5);

  //rotate point of pentagons so they are inside the alloy arms
  extrudeCentreBoreMesh.rotateOnWorldAxis(z, Math.PI);
  return extrudeCentreBoreMesh;
}

function extrudeTireProfile(alloyRadExtrusionSettings, tireMat)
{
  // the tire fills the gap between the rims comes out halfway on the rims
  // edge then up for the wal of the tire and arc to flat thread

  var tireProfile = new THREE.Shape();
  tireProfile.moveTo(0, 5);
  tireProfile.lineTo(0, 6);
  tireProfile.lineTo(-.5, 6);
  tireProfile.lineTo(-.5, 9);
  circleTo(tireProfile, [4.5, 9], [-.5, 9], -Math.PI / 2, 10);
  //now at 5, 11
  tireProfile.lineTo(15.5, 14);
  circleTo(tireProfile, [15.5, 9], [15.5, 14], -Math.PI / 2, 10);
  //now at 20, 6
  tireProfile.lineTo(20.5, 6);
  tireProfile.lineTo(20, 6);
  tireProfile.lineTo(20, 5);
  tireProfile.lineTo(0, 5);

  var tireGeo = new THREE.ExtrudeGeometry(tireProfile, alloyRadExtrusionSettings);
  tireGeo.computeVertexNormals();

  return new THREE.Mesh(tireGeo, tireMat);
}

function extrudeAlloyArms(greyPaintMat)
{
  //estrusion path is arc from origin offset by 5 on z and y and ends on the inner alloy mesh
  var catCurve = new THREE.Curve();
  //draw a partial circle on the yz plane
  catCurve.getPoint = function (t) {
    var centrePoint = new THREE.Vector3(0, 25, -40);
    var firstPoint = new THREE.Vector3(0, 5, -5);
    var radians = 0.0;
    radians = Math.atan2(Math.abs(centrePoint.y - firstPoint.y), Math.abs(centrePoint.z - firstPoint.z));
    var radianDistRotation = t * radians;
    var newZ = centrePoint.z + (firstPoint.z - centrePoint.z) * Math.cos(radianDistRotation) - (firstPoint.y - centrePoint.y) * Math.sin(radianDistRotation);
    var newY = centrePoint.y + (firstPoint.z - centrePoint.z) * Math.sin(radianDistRotation) + (firstPoint.y - centrePoint.y) * Math.cos(radianDistRotation);
    return new THREE.Vector3(0, newY, newZ);
  };
  
  //shape of cross section of the arm itself
  var alloyArmCrossSection = new THREE.Shape();
  alloyArmCrossSection.moveTo(-3, 0);
  alloyArmCrossSection.moveTo(-3, 2);
  circleTo(alloyArmCrossSection, [-2, 2], [-3, 2], -Math.PI / 2, 5);
  alloyArmCrossSection.lineTo(2, 3);
  circleTo(alloyArmCrossSection, [2, 2], [2, 3], -Math.PI / 2, 5);
  alloyArmCrossSection.lineTo(3, 0);
  alloyArmCrossSection.lineTo(-3, 0);
  
  //extrusion itself
  var alloyArmExtrusionSettings = { steps: 20, extrudePath: catCurve, bevelEnabled: false };
  var alloyArmExtrude = new THREE.ExtrudeGeometry(alloyArmCrossSection, alloyArmExtrusionSettings);
  alloyArmExtrude.computeVertexNormals();
  
  var alloyArmExtrudeMesh = new THREE.Mesh(alloyArmExtrude, greyPaintMat);
  alloyArmExtrudeMesh.translateOnAxis(z, -3);
  
  //multiply by 5 and return array to add to nested coord system
  return dupAndRotate(alloyArmExtrudeMesh, Math.PI * 2, 5);
}

function extrudeSharpArmNib(shinySurface)
{
  //now for "nib" on each arm of the alloy, a separate extrusion
  // repeat five times rotating on world axis for 360' (72' between) each time
  //start at tdc for first point
  var alloyArmNib = new THREE.Shape();
  alloyArmNib.moveTo(-3, 25);
  alloyArmNib.lineTo(3, 25);
  circleTo(alloyArmNib, [-3, 32], [3, 25], -Math.atan2(6, 7), 5);
  var armNibExtrusionSettings = {
    bevelEnabled: false, depth: 5
  };
  var alloyArmNibGeo = new THREE.ExtrudeGeometry(alloyArmNib, armNibExtrusionSettings);
  var alloyArmNibMesh = new THREE.Mesh(alloyArmNibGeo, shinySurface);
  alloyArmNibMesh.translateOnAxis(z, -4);
  var alloyNibs = dupAndRotate(alloyArmNibMesh, Math.PI * 2, 5);
  return alloyNibs;
}

function makeRimEdge(alloyRadExtrusionSettings, shinySurface)
{
  //for rim edge loft a square along the same 3d circle path
  //other side of rim as a clone of same extrusion translated in the z axis
  var outerAlloyRim = new THREE.Shape();
  outerAlloyRim.moveTo(-1, 5);
  outerAlloyRim.lineTo(-1, 6);
  outerAlloyRim.lineTo(0, 6);
  outerAlloyRim.lineTo(0, 5);
  outerAlloyRim.lineTo(-1, 5);

  var alloyRimGeometry = new THREE.ExtrudeGeometry(outerAlloyRim, alloyRadExtrusionSettings);
  
  return new THREE.Mesh(alloyRimGeometry, shinySurface);
}

function makeInnerAlloyExtrusion(alloyRadExtrusionSettings, greyPaintMat)
{
  var innerAlloyShape = new THREE.Shape();
  innerAlloyShape.moveTo(5, 5);
  circleTo(innerAlloyShape, [5, 5], [0, 5], Math.PI / 2, 5);
  //now at 5, 0
  innerAlloyShape.lineTo(15, 0);
  circleTo(innerAlloyShape, [15, 5], [15, 0], Math.PI / 2, 5);
  //now at 20, 5
  innerAlloyShape.lineTo(5, 5);
  var innerAlloyGeometry = new THREE.ExtrudeGeometry(innerAlloyShape, alloyRadExtrusionSettings);
  innerAlloyGeometry.computeVertexNormals();
  // use this geometry for a mesh
  var meshInnerAlloy = new THREE.Mesh(innerAlloyGeometry, greyPaintMat);
  //adding mesh to nested system and moving end of closed loop before arms are added hiding mesh end
  meshInnerAlloy.rotateOnWorldAxis(z, Math.PI / 9);
  return meshInnerAlloy;
}

function animate()
{
  setTimeout(animate, 1000/20);

  //small convenient animation frame rate is almost constant
  centreAlloyMesh.rotateOnWorldAxis(z, Math.PI/72);

  orbitcontrols.update();
  renderer.render(scene, camera);
}