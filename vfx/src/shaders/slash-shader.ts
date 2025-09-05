
import { attributes, clamp, edgeDepthEffect, float, FloatNode, floor, mix, mod, oneMinus, particleUniforms, pow, rgb, sampleSceneColor, screenUV, standardMaterial, textureSampler2d, timeUniforms, varying, varyingAttributes, vec2, Vec2Node } from "@hology/core/shader-nodes";
import { NodeShader, NodeShaderOutput, Parameter } from "@hology/core/shader/shader";
import { Color, DoubleSide, ShaderMaterial, Texture } from 'three';

export default class SlashShader extends NodeShader {
  @Parameter()
  isParticle: boolean = false
  @Parameter()
  color1: Color = new Color(0xFF0000)
  @Parameter()
  color2: Color = new Color(0x0C00FF)
  @Parameter()
  depthFade: number = 3
  @Parameter()
  emissiveContrast: number = 2
  @Parameter()
  emissivePower: number = 1
  @Parameter()
  erosionAmount: number = -1
  @Parameter()
  erosionSpeedU: number = 1
  @Parameter()
  erosionSpeedV: number = 1
  @Parameter()
  erosionTileU: number = 1
  @Parameter()
  erosionTileV: number = 1
  @Parameter()
  masked: boolean = false
  @Parameter()
  noise: Texture = new Texture()
  @Parameter()
  noisePower: number = 0.3
  @Parameter()
  noiseRangeContrast: number = 0
  @Parameter()
  noiseSpeedU: number = 1
  @Parameter()
  noiseSpeedV: number = 0
  @Parameter()
  noiseTileU: number = 1
  @Parameter()
  noiseTileV: number = 1
  @Parameter()
  opacityContrastControl: number = 1
  @Parameter()
  slashTexture: Texture = new Texture()
  @Parameter()
  speedU: number = 0
  @Parameter()
  voronoi: Texture = new Texture()
  @Parameter()
  refractionStrength = 0.15



  output(): NodeShaderOutput {

    // Noise Tile, intensity & panning controls
    const noiseSpeed = vec2(this.noiseSpeedU, this.noiseSpeedV)
    const noiseTile = vec2(this.noiseTileU, this.noiseTileV)
    const noiseCoord = panner(null, noiseSpeed, noiseTile)
    const noiseSampler = textureSampler2d(this.noise)
    const noiseSample = noiseSampler.sample(noiseCoord)
    const noise = noiseSample.r.multiply(this.noisePower)

    // Noise Mask
    const noiseMask = pow(clamp(oneMinus(varyingAttributes.uv.x), 0, 1), this.noiseRangeContrast)

    // Move texture
    const time = this.isParticle 
      ? oneMinus(pow(particleUniforms.energy, 1.5))
      // Looping animation
      : mod(timeUniforms.elapsed, float(1))  
    const moveTexture = mix(float(-0.95), float(0.95), time)

    // Main Texture
    const slashCoordOffset = noise.multiply(noiseMask)
    const slashCoord = panner(moveTexture, vec2(this.speedU, 0)).addScalar(slashCoordOffset)
    const slashSampler = textureSampler2d(this.slashTexture)
    const slashSample = slashSampler.sample(slashCoord)

    // Color Controls
    const color1 = rgb(this.color1)
    const color2 = rgb(this.color2)
    const emissiveMask = pow(slashSample.r, this.emissiveContrast) 
    const colorMix = mix(color1, color2, emissiveMask)
    const emissive = color2.multiplyScalar(emissiveMask).multiplyScalar(this.emissivePower)

    const color = standardMaterial({color: colorMix, emissive: emissive}).rgb


    // Erosion Texture Controls
    const erosionSpeed = vec2(this.erosionSpeedU, this.erosionSpeedV)
    const erosionTile = vec2(this.erosionTileU, this.erosionTileV)
    const erosionCoord = panner(null, erosionSpeed, erosionTile)
    const voronoiSampler = textureSampler2d(this.voronoi)
    const voronoiSample = voronoiSampler.sample(erosionCoord)
    const erosion = clamp(voronoiSample.r.add(this.erosionAmount), 0, 1)
    const combinedSlashErosion = clamp(slashSample.r.subtract(erosion), 0, 1)

    const baseOpacity = pow(combinedSlashErosion, this.opacityContrastControl)
    const maskedOpacity = this.masked
      ? floor(baseOpacity)
      : baseOpacity

    // Vertex color 
    const vertexColorMask = varying(attributes.color.r)

    // Depth fade
    const opacity = maskedOpacity
      .multiply(vertexColorMask)
      .multiply(oneMinus(edgeDepthEffect(this.depthFade)))

    // Refraction
    const refractionOffset = noise
      .multiply(this.refractionStrength)
      .multiply(vertexColorMask)
    const sceneColor = sampleSceneColor(screenUV.addScalar(refractionOffset)).rgb
    const colorAndRefraction = mix(sceneColor, color, opacity)

    return {
      // color: sampleSceneColor(varyingAttributes.uv),
      // transparent: true,
      // alphaTest: 0.1,
      color: colorAndRefraction
      // color: color.rgba(opacity),
    }
  } 

  build() {
    const mat = super.build()
    mat.side = DoubleSide
    // Need two passes to avoid artifacts
    mat.forceSinglePass = false
    return mat
  }

}

const flippedUv = vec2(varyingAttributes.uv.x, oneMinus(varyingAttributes.uv.y))

function panner(time: FloatNode|number|null|undefined, speed: Vec2Node, tile: Vec2Node = vec2(1, 1), coord: Vec2Node = flippedUv) {
  return coord.multiply(tile).add(speed.multiplyScalar(time ?? timeUniforms.elapsed))
}