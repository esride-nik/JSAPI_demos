import WebScene from "esri/WebScene";
import SceneView from "esri/views/SceneView";
import esriRequest from "esri/request";

function App() {

    let webscene: WebScene;
    let view: SceneView;

    const intro = document.getElementById("intro");
    const loading = document.getElementById("loading");
    const error = document.getElementById("error");

    // settings
    let speedFactor: number = 0.02;
    let offset: number = 3000;
    let mode = "light";
    let startAt = 0;
    let id: string;
    let city: string;
    let easing = "in-out-coast-quadratic";
    let noSketch = false;
    let glowy = false;
    let atmosphere = false;
    let noUpdates = false;

    let aniSlideCounter: number;

    // function to retrieve query parameters (in this case only id)
    function getUrlParams() {
        const queryParams = document.location.search.substr(1);
        let result: any = {};

        queryParams.split("?").map((params: string) => {
            params.split("&").map((param: string) => {
                var item = param.split("=");
                result[item[0]] = decodeURIComponent(item[1]);
            })
        });

        id = result.id;
        city = result.city;
        if (result.mode) mode = result.mode;
        if (result.speedFactor) speedFactor = result.speedFactor;
        if (result.offset) offset = result.offset;
        if (result.startAt) startAt = result.startAt;
        if (result.easing) easing = result.easing;
        if (result.noSketch) noSketch = result.noSketch;
        if (result.glowy) glowy = result.glowy;
        if (result.atmosphere) atmosphere = result.atmosphere;
        if (result.noUpdates) noUpdates = result.noUpdates;
    }

    getUrlParams();

    // if user loaded scene by setting an id in the url, load that scene
    if (id) {
        setScene(id);
        // else display the intro text
    } else if (city) {
        // load the cities from the json file
        esriRequest('./cities.json', {
            responseType: "json"
        })
            .then((response: any) => {
                let cityCfg = response.data.cities.filter((cityCfg: any) => {
                    if (cityCfg.short === city) {
                        return true;
                    };
                });
                if (cityCfg) {
                    console.log("City shortcode found.", cityCfg[0]);
                    id = cityCfg[0].id;
                    setScene(id);
                }
                else {
                    console.error("City shortcode not found.");

                }
            });
    }
    else {
        console.error("Please provide city or id URL parameter.");
    }


    //  visualization mode
    if (mode === "dark") {
        document.getElementById("customCSS").href = "./styles/dark.css";
    } else {
        document.getElementById("customCSS").href = "./styles/light.css";
    }



    function setSketchRenderer(layer) {

        if (noSketch == false) {

            const outlineColor = mode === "dark" ? [255, 255, 255, 0.8] : [0, 0, 0, 0.8];
            const fillColor = mode === "dark" ? [10, 10, 10, 0.1] : [255, 255, 255, 0.1];
            const size = mode === "dark" ? 2 : 1;

            const sketchEdges = {
                type: "sketch",
                color: outlineColor,
                size: size,
                extensionLength: 2
            };

            // this renderers all the layers with semi-transparent white faces
            // and displays the geometry with sketch edges
            const renderer = {
                type: "simple", // autocasts as new SimpleRenderer()
                symbol: {
                    type: "mesh-3d",
                    symbolLayers: [{
                        type: "fill",
                        material: {
                            color: fillColor,
                            colorMixMode: "replace"
                        },
                        edges: sketchEdges
                    }]
                }
            };
            layer.renderer = renderer;
        }

    }

    // when the webscene has slides, they are added in a list at the bottom
    function createPresentation(slides: any) {
        console.log("createPresentation", slides.items);

        // TODO: choose from animation styles here (need to implement them first... DepthOfField, revolve)
        playAnimation(slides.items);
    }

    function playAnimation(slides: any[]) {
        if (startAt > slides.length) startAt = 0;
        aniSlideCounter = startAt;

        console.log("Playing flight on click", slides, view, " | speedFactor:", speedFactor, " | offset (ms):", offset, " | starting at slide ", startAt);

        view.on("click", (e: any) => {
            console.log("click starts animation");

            if (noUpdates) {
                suspendUpdates(true);
            }
            aniNextLocation(slides);
        });
    }

    function aniNextLocation(slides: any[]) {
        console.log("Approaching location #" + aniSlideCounter, slides[aniSlideCounter], slides[aniSlideCounter].viewpoint);
        new Promise((resolve: any) => {
            setTimeout(resolve, offset);
        }).then(() => {
            console.log("Offset over", offset);
            if (aniSlideCounter <= slides.length) {
                view.goTo(slides[aniSlideCounter].viewpoint, {
                    animate: true,
                    speedFactor: speedFactor,
                    maxDuration: 1000000,
                    easing: easing
                }).then(() => {
                    aniNextLocation(slides)
                });
                aniSlideCounter++;
            }
        });
    }

    function setScene(id) {
        if (noSketch == false) {
            setSketchScene(id);
        }
        else {
            setOriginalScene(id);
        }
    }

    function setSketchScene(id) {
        console.log("Setting sketch scene for ", id);


        if (!intro.classList.contains("hide")) {
            intro.classList.add("hide");
        }
        if (!error.classList.contains("hide")) {
            error.classList.add("hide");
        }
        loading.classList.remove("hide");

        // create an empty webscene
        webscene = new WebScene({
            ground: {
                opacity: 0
            },
            basemap: null
        });

        // create a view with a transparent background
        view = new SceneView({
            container: "viewDiv",
            map: webscene,
            alphaCompositingEnabled: true,
            environment: {
                background: {
                    type: "color",
                    color: [0, 0, 0, 0]
                },
                starsEnabled: false,
                atmosphereEnabled: false
            },
            ui: {
                components: ["attribution"]
            }
        });

        // load the webscene with the city
        const origWebscene = new WebScene({
            portalItem: {
                id: id
            }
        });

        // once all resources are loaded...
        origWebscene.loadAll().then(function () {

            // select the 3D object scene layers only
            const sceneLayers = origWebscene.allLayers.filter(function (layer) {
                return (layer.type === "scene" && layer.geometryType === "mesh");
            });

            // apply the sketch renderer and disable popup
            sceneLayers.forEach(function (layer) {
                setSketchRenderer(layer);
                layer.popupEnabled = false;
            });

            // add these layers to the empty webscene
            webscene.addMany(sceneLayers);

            // go to initial viewpoint in the scene
            view.goTo(origWebscene.initialViewProperties.viewpoint)
                .then(function () {
                    loading.classList.add("hide");
                })
                .catch(function (err) {
                    console.log(err);
                });

            // generate the presentation
            webscene.presentation = origWebscene.presentation.clone();
            createPresentation(webscene.presentation.slides);
        });

        window.view = view;
    }

    function setOriginalScene(id) {
        console.log("Setting original scene for ", id);

        if (!intro.classList.contains("hide")) {
            intro.classList.add("hide");
        }
        if (!error.classList.contains("hide")) {
            error.classList.add("hide");
        }
        loading.classList.remove("hide");

        // create an empty webscene
        webscene = new WebScene({
            portalItem: {
                id: id
            }
        });

        let environmentParams: any = {
            starsEnabled: true,
            atmosphereEnabled: true,
            atmosphere: {
                quality: "high"
            }
        };
        if (glowy) {
            document.getElementsByTagName("body")[0].setAttribute("style", "background-image:none;background-color:#000;");

            let atmosphereEnabled = false;
            if (atmosphere) {
                atmosphereEnabled = true;
            }
            environmentParams = {
                starsEnabled: false,
                atmosphereEnabled: atmosphereEnabled
            };
        }

        // create a view with a transparent background
        view = new SceneView({
            container: "viewDiv",
            map: webscene,
            qualityProfile: "high",
            alphaCompositingEnabled: true,
            environment: environmentParams,
            ui: {
                components: ["attribution"]
            }
        });

        view.when(function() {
            view.environment.background = {
              type: "color",
              color: [0, 0, 0, 0]
            };
        
            // view.constraints.clipDistance.far = 50000000;

            if (glowy) {
                let viewDiv = document.getElementById("viewDiv");
                viewDiv.setAttribute("style", "filter: drop-shadow(0 10px 10px rgba(255, 243, 131, 0.5))");
                // viewDiv.setAttribute("style", "filter: drop-shadow(0 0 10px rgba(255, 243, 131, 0.5))");
    
                let viewDivCanvas = viewDiv.getElementsByTagName("canvas")[0];
                viewDivCanvas.setAttribute("style", "filter: drop-shadow(0 0 5px rgba(255, 243, 131, 0.6))");
            }
          });

        // once all resources are loaded...
        webscene.loadAll().then(function () {
            // go to initial viewpoint in the scene
            view.goTo(webscene.initialViewProperties.viewpoint)
                .then(function () {
                    loading.classList.add("hide");
                })
                .catch(function (err) {
                    console.log(err);
                });

            // generate the presentation
            createPresentation(webscene.presentation.slides);
        });

        window.view = view;
    }

    function suspendUpdates(suspended) {
        // Suspend any terrain updates
        view.basemapTerrain.suspended = suspended;

        // Suspend any feature layer updates (when tiled)
        view.featureTiles.suspended = suspended;

        view.allLayerViews.forEach((lv) => {
            if ("_controller" in lv && "_updatesDisabled" in lv._controller) {
                if (suspended) {
                    lv._controller._updatesDisabled = true;
                    lv._controller.cancelNodeLoading();
                } else {
                    lv._controller._updatesDisabled = false;
                    lv._controller._startNodeLoading();
                }
            }
        });
    }

};

App();
