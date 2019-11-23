'use strict'
var orbitcontrols, camera, scene, renderer;
var meshToAnimate = [];
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
    scene.add(meshToDup);
    meshToDup = meshToDup.clone();
    meshToDup.rotateOnWorldAxis(z, radiansBetweenSpokes);
    scene.add(meshToDup);
    degreeRotatedMeshPoints += radiansBetweenSpokes;
  } while(degreeRotatedMeshPoints < totalRads)

  return allMeshReferences;
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

  var axesHelper = new THREE.AxesHelper( 5 );
  scene.add( axesHelper );

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
  var shinySurface = new THREE.MeshStandardMaterial({emissive: 0x999999, specular: 0x505050, shininess: 100, metalness: 1, roughness:.25});
  var tireMat = new THREE.MeshLambertMaterial({color: 0x222222});

  //make inner alloy shape
  var innerAlloyShape = new THREE.Shape();
  innerAlloyShape.moveTo(5,5)
  circleTo(innerAlloyShape, [5,5], [0,5], Math.PI/2, 5);
  //now at 5, 0
  innerAlloyShape.lineTo(15, 0);
  circleTo(innerAlloyShape, [15,5], [15,0], Math.PI/2, 5);
  //now at 20, 5
  innerAlloyShape.lineTo(5, 5);

  var innerAlloyDiameterCurve = new THREE.Curve();
  innerAlloyDiameterCurve.getPoint = function (t)
  {
    var segment = (-2 * Math.PI) * t;
    return new THREE.Vector3(20 * Math.cos(segment), 20 * Math.sin(segment), 0);
  };
  //new THREE.CubicBezierCurve3([ new THREE.Vector3(0,0,0), new THREE.Vector3(40,40,0), new THREE.Vector3(0,80,0), new THREE.Vector3(-40,40,0), new THREE.Vector3(0,0,0)])
  innerAlloyDiameterCurve.closed = true;

  var alloyRadExtrusionSettings = {
    steps: 40, extrudePath: innerAlloyDiameterCurve, isClosed: true
  };
  var innerAlloyGeometry = new THREE.ExtrudeGeometry( innerAlloyShape, alloyRadExtrusionSettings );
  innerAlloyGeometry.computeVertexNormals();

  // use this geometry for a mesh
  var meshInnerAlloy = new THREE.Mesh(
    innerAlloyGeometry, 
    greyPaintMat );

  scene.add(meshInnerAlloy);

  //now for raw edge of alloy (2 concentric circles for rim and one more small for edge then join)
  //ACTUALLY i'll loft a square this along the same circle path on the other side, then extrude the 3rd circle as a clone of extrusions rotated by 72'
  var outerAlloyRim = new THREE.Shape();
  outerAlloyRim.moveTo(-1, 5);
  outerAlloyRim.lineTo(-1, 6);
  outerAlloyRim.lineTo(0, 6);
  outerAlloyRim.lineTo(0, 5);
  outerAlloyRim.lineTo(-1, 5);

  var innerAlloyGeometry = new THREE.ExtrudeGeometry( outerAlloyRim, alloyRadExtrusionSettings );
  var meshAlloyRimOuter = new THREE.Mesh(
    innerAlloyGeometry, 
    shinySurface );

  scene.add(meshAlloyRimOuter);

  var meshAlloyRimInner = meshAlloyRimOuter.clone();
  meshAlloyRimInner.translateOnAxis(z, -21);
  scene.add(meshAlloyRimInner);

  //now for "nib" on each arm of the alloy, a seperate extrusion, then repeat five times rotating on world axis x 72' each time
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
  meshToAnimate = dupAndRotate(alloyArmNibMesh, Math.PI*2, 5);

  var catCurve = new THREE.Curve();
  //draw a partial circle on the yz plane
  catCurve.getPoint = function (t)
  {
    var centrePoint = new THREE.Vector3(0,25,-40);
    var firstPoint = new THREE.Vector3(0,5,-5);
    var radians = 0.0;
    radians = Math.atan2(Math.abs(centrePoint.y-firstPoint.y), Math.abs(centrePoint.z-firstPoint.z));
    var radianDistRotation = t * radians;
    var newZ = centrePoint.z+(firstPoint.z-centrePoint.z)*Math.cos(radianDistRotation)- (firstPoint.y-centrePoint.y)*Math.sin(radianDistRotation);
    var newY = centrePoint.y+(firstPoint.z-centrePoint.z)*Math.sin(radianDistRotation)+ (firstPoint.y-centrePoint.y)*Math.cos(radianDistRotation);
    return new THREE.Vector3(0, newY, newZ);
  };

  var alloyArmCrossSection = new THREE.Shape();
  alloyArmCrossSection.moveTo(-3, 0);
  alloyArmCrossSection.moveTo(-3, 2);
  circleTo(alloyArmCrossSection, [-2, 2], [-3, 2], -Math.PI/2, 5);
  alloyArmCrossSection.lineTo(2, 3);
  circleTo(alloyArmCrossSection, [2, 2], [2, 3], -Math.PI/2, 5);
  alloyArmCrossSection.lineTo(3, 0);
  alloyArmCrossSection.lineTo(-3, 0);

  var alloyArmExtrusionSettings = {steps: 20, extrudePath: catCurve, bevelEnabled: false};

  var alloyArmExtrude = new THREE.ExtrudeGeometry(alloyArmCrossSection, alloyArmExtrusionSettings);
  alloyArmExtrude.computeVertexNormals();
  var alloyArmExtrudeMesh = new THREE.Mesh(alloyArmExtrude, greyPaintMat);
  alloyArmExtrudeMesh.translateOnAxis(z, -3);
  Array.prototype.push.apply(meshToAnimate, dupAndRotate(alloyArmExtrudeMesh, Math.PI*2, 5));

  //centre bore/wheel nut faceplate to set
  var centreBoreShape = new THREE.Shape();
  centreBoreShape.moveTo(0, -7);
  circleTo(centreBoreShape, [0, 0], [0, -7], Math.PI * 2, 5);
  var extrusionSettings2 = {depth: 3, steps: 1, bevelEnabled: true, bevelSegments: 2, bevelOffset: 0, bevelThickness: 1, bevelSize: 1}
  var extrudeCentreBore = new THREE.ExtrudeGeometry(centreBoreShape, extrusionSettings2);
  var extrudeCentreBoreMesh = new THREE.Mesh(extrudeCentreBore, greyPaintMat);
  extrudeCentreBoreMesh.translateOnAxis(z, -8.5);
  extrudeCentreBoreMesh.rotateOnWorldAxis(z, Math.PI);
  meshToAnimate.push(extrudeCentreBoreMesh);
  scene.add(extrudeCentreBoreMesh);

  //next add tire black lambert for rubber
  var tireProfile = new THREE.Shape();
  tireProfile.moveTo(0,5)
  tireProfile.lineTo(0,6)
  tireProfile.lineTo(-.5,6)
  tireProfile.lineTo(-.5,9)
  circleTo(tireProfile, [4.5,9], [-.5,9], -Math.PI/2, 10);
  //now at 5, 11
  tireProfile.lineTo(15.5, 14);
  circleTo(tireProfile, [15.5,9], [15.5,14], -Math.PI/2, 10);
  //now at 20, 6
  tireProfile.lineTo(20.5, 6);
  tireProfile.lineTo(20, 6);
  tireProfile.lineTo(20, 5);
  tireProfile.lineTo(0, 5);
  var tireGeo = new THREE.ExtrudeGeometry(tireProfile, alloyRadExtrusionSettings);
  tireGeo.computeVertexNormals();
  var tireMesh = new THREE.Mesh(tireGeo, tireMat);
  scene.add(tireMesh);

  var audiCurve = new THREE.Curve();

  audiCurve.getPoint = function (t)
  {
    var segment = (-2 * Math.PI) * t;
    return new THREE.Vector3(.5 * Math.cos(segment), .5 * Math.sin(segment), 0);
  };

  var t = 0.0;
  var tInc = 1/10;
  var audiPoints = [];
  while(t <= 1)
  {
    audiPoints.push(audiCurve.getPoint(t));
    t += tInc;
  }
  var geometry = new THREE.BufferGeometry().setFromPoints( audiPoints );

  var material = new THREE.LineBasicMaterial( { color : 0x000000} );
  var curveObject = new THREE.Line( geometry, material );
  curveObject.translateOnAxis(x, -1.125);//half the distance between the cetre of the 4 circles
  curveObject.translateOnAxis(z, -4.5);//face of bevel

  for(var i = 0; i < 4; i++)
  {
    scene.add(curveObject);
    curveObject = curveObject.clone();
    curveObject.translateOnAxis(x, .75);
  }

  // render the scene as seen by the camera
  renderer.render(scene, camera);

  animate();
}

function animate()
{
  setTimeout(animate, 1000/10);

  orbitcontrols.update();
  renderer.render(scene, camera);
}