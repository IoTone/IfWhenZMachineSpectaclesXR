// RainOfObjects.js
// Version: 0.1.0
// Event: On Awake
// Description: Instantiates scene objects for collision.

// @input SceneObject dynamicBox
// @input SceneObject parentObject
// @input SceneObject target
// @input float interval = 0.5
// @input float spawnRadius = 8
// @input float spawnHeight = 20

var initialized = false;
script.timer = 0;
script.objects = [];
script.killHeight = 0;

script.spawnObject = function (basePosition) {
    var theta = Math.random() * script.spawnRadius;
    var position = basePosition.add(vec3.right().uniformScale(Math.cos(theta)));
    position = position.add(vec3.back().uniformScale(Math.sin(theta)));
    
    var rotation = quat.fromEulerAngles(Math.random() * 180, Math.random() * 180, Math.random() * 180);
    var obj = script.parentObject.copyWholeHierarchy(script.dynamicBox);
    obj.getTransform().setWorldPosition(position);
    obj.getTransform().setWorldRotation(rotation);
    script.objects.push(obj);
}

script.createEvent("UpdateEvent").bind(function () {
    if (!initialized) {
        return;
    }
    
        script.timer += getDeltaTime();
        if (script.timer > script.interval) {
            script.timer = 0;
            var spawnPosition = script.target.getTransform().getWorldPosition().add(vec3.up().uniformScale(script.spawnHeight));
            script.spawnObject(spawnPosition);
        }
        script.killHeight = script.target.getTransform().getWorldPosition().add(vec3.down().uniformScale(100));

    for (var i = script.objects.length - 1; i >= 0; i--) {
        if (script.objects[i].getTransform().getWorldPosition().y < script.killHeight) {
            var obj = script.objects[i];
            obj.destroy();
            script.objects.splice(i, 1);
        }
    }
});

function checkInputValues() {
    if (script.dynamicBox == null) {
        print("ERROR: Make sure to set Dynamic Box");
        return false;
    }

    if (script.parentObject == null) {
        print("ERROR: Make sure to set Parent Object");
        return false;
    }

    return true;
}

function initialize() {
   
    if (checkInputValues()) {
        initialized = true;

    }
    
}

initialize();

