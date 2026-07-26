/**
 * estimator.js
 * Computes real geometric volume from the mesh (via the divergence
 * theorem / signed-tetrahedron-volume method) and derives weight,
 * estimated print time, filament consumption and cost from it.
 * These are engineering *estimates*, not a slicer replacement - the
 * UI always labels them as "estimado".
 */
(function (global) {
  'use strict';

  const MATERIAL_DENSITY = { // g/cm3
    PLA: 1.24,
    PETG: 1.27,
    ABS: 1.04,
    TPU: 1.21,
    ASA: 1.05,
    NYLON: 1.14,
  };

  /** Exact solid volume (mm^3) of a closed triangle mesh via signed tetrahedra. */
  function meshVolumeMm3(geometry) {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    const pos = geo.attributes.position;
    let vol = 0;
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      p0.fromBufferAttribute(pos, i);
      p1.fromBufferAttribute(pos, i + 1);
      p2.fromBufferAttribute(pos, i + 2);
      vol += p0.dot(p1.clone().cross(p2)) / 6;
    }
    return Math.abs(vol);
  }

  function boundingDimsMm(geometry) {
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    return {
      x: bb.max.x - bb.min.x,
      y: bb.max.y - bb.min.y,
      z: bb.max.z - bb.min.z,
    };
  }

  /**
   * @param {Object} opts
   * @param {THREE.BufferGeometry} opts.geometry
   * @param {string} [opts.material='PLA']
   * @param {number} [opts.infillPercent=20]   0-100
   * @param {number} [opts.wallLoops=3]
   * @param {number} [opts.layerHeight=0.2]    mm
   * @param {number} [opts.printSpeedMmS=60]   average XY print speed
   * @param {number} [opts.filamentDiameter=1.75] mm
   * @param {number} [opts.filamentPriceKg=120]    R$/kg
   * @param {number} [opts.energyPriceKwh=0.75]    R$/kWh
   * @param {number} [opts.printerWatts=120]
   * @param {number} [opts.laborCost=0]        R$ flat fee added to the total
   * @param {number} [opts.marginPercent=0]    profit margin applied on top of cost
   */
  function estimate(opts) {
    const {
      geometry, material = 'PLA', infillPercent = 20, wallLoops = 3,
      layerHeight = 0.2, printSpeedMmS = 60, filamentDiameter = 1.75,
      filamentPriceKg = 120, energyPriceKwh = 0.75, printerWatts = 120,
      laborCost = 0, marginPercent = 0,
    } = opts;

    const volumeMm3 = meshVolumeMm3(geometry);
    const volumeCm3 = volumeMm3 / 1000;
    const dims = boundingDimsMm(geometry);
    const density = MATERIAL_DENSITY[material] || MATERIAL_DENSITY.PLA;

    // Effective printed-material fraction: shell walls are ~solid, the
    // core follows the infill percentage. We approximate the shell
    // fraction from wall loop count vs. the model's smallest dimension
    // and blend it with the chosen infill density.
    const nozzleWidth = 0.42; // mm, typical 0.4mm nozzle extrusion width
    const shellThickness = wallLoops * nozzleWidth;
    const smallestDim = Math.max(Math.min(dims.x, dims.y, dims.z), 0.1);
    const shellFraction = Math.min(1, (shellThickness * 2) / smallestDim);
    const coreFraction = 1 - shellFraction;
    const effectiveFraction = shellFraction + coreFraction * (infillPercent / 100);

    const effectiveVolumeCm3 = volumeCm3 * effectiveFraction;
    const weightG = effectiveVolumeCm3 * density;

    // Filament length from extruded volume / filament cross-section area.
    const filamentAreaMm2 = Math.PI * (filamentDiameter / 2) ** 2;
    const filamentLengthMm = (effectiveVolumeCm3 * 1000) / filamentAreaMm2;
    const filamentMeters = filamentLengthMm / 1000;

    // Print time: number of layers x average time per layer, where the
    // per-layer time is derived from the effective extruded volume of
    // that slice divided by a volumetric flow rate implied by speed,
    // line width and layer height (a common slicer heuristic).
    const numLayers = Math.max(1, Math.round(dims.y / layerHeight));
    const volumetricFlowMm3S = printSpeedMmS * nozzleWidth * layerHeight;
    const extrudedVolumeMm3 = volumeMm3 * effectiveFraction;
    const printSeconds = extrudedVolumeMm3 / volumetricFlowMm3S;
    // Add a per-layer travel/retraction overhead allowance (~1.1s/layer).
    const totalSeconds = printSeconds + numLayers * 1.1;
    const timeHours = totalSeconds / 3600;

    const filamentCost = (weightG / 1000) * filamentPriceKg;
    const energyCost = (printerWatts / 1000) * timeHours * energyPriceKwh;
    const subtotal = filamentCost + energyCost + laborCost;
    const costTotal = subtotal * (1 + marginPercent / 100);

    return {
      volumeCm3,
      dims,
      weightG,
      filamentMeters,
      timeHours,
      numLayers,
      costBreakdown: { filamentCost, energyCost, laborCost, marginValue: costTotal - subtotal },
      costTotal,
    };
  }

  function formatTime(hours) {
    const totalMin = Math.round(hours * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }

  global.VertoEstimator = { estimate, meshVolumeMm3, boundingDimsMm, MATERIAL_DENSITY, formatTime };
})(window);
