import { rgb, rgba, textureSampler2d, timeUniforms, varyingAttributes, vec2 } from "@hology/core/shader-nodes";
import { NodeShader, NodeShaderOutput, Parameter } from "@hology/core/shader/shader";
import { Color, Texture } from 'three';
import { parameter } from "three/webgpu";

export default class ScrollingShader extends NodeShader {
  @Parameter()
  texture: Texture = new Texture()

  @Parameter()
  speedX: number = 1

  @Parameter()
  speedY: number = 0

  @Parameter()
  color: Color = new Color(0xffffff)

  output(): NodeShaderOutput {
    const coord = varyingAttributes.uv.add(vec2(this.speedX, this.speedY).multiplyScalar(timeUniforms.elapsed))
    const textureSample = textureSampler2d(this.texture).sample(coord)
    return {
      color: rgba(textureSample.rgb.multiply(rgb(this.color)), textureSample.a),
      transparent: true,
    
    }
  } 
}