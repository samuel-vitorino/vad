import { log } from "./logging"

interface ResamplerOptions {
  nativeSampleRate: number
  targetSampleRate: number
  targetFrameSize: number
}

export class Resampler {
  inputBuffer: Array<number>

  constructor(public options: ResamplerOptions) {
    if (options.nativeSampleRate < 16000) {
      log.error(
        "nativeSampleRate is too low. Should have 16000 = targetSampleRate <= nativeSampleRate"
      )
    }
    this.inputBuffer = []
  }

  process = (audioFrame: Float32Array): {resampledBuffer: Float32Array[], originalBuffer: Float32Array[]} => {
    const outputResampledFrames: Array<Float32Array> = []
    const outputOriginalFrames: Array<Float32Array> = []

    for (const sample of audioFrame) {
      this.inputBuffer.push(sample)

      while (this.hasEnoughDataForFrame()) {
        const outputFrame = this.generateOutputFrame()
        outputResampledFrames.push(outputFrame.resampled)
        outputOriginalFrames.push(outputFrame.original)
      }
    }

    return {
      resampledBuffer: outputResampledFrames,
      originalBuffer: outputOriginalFrames,
    }
  }

  async *stream(audioInput: Float32Array) {
    for (const sample of audioInput) {
      this.inputBuffer.push(sample)

      while (this.hasEnoughDataForFrame()) {
        const outputFrame = this.generateOutputFrame()
        yield outputFrame
      }
    }
  }

  private hasEnoughDataForFrame(): boolean {
    return (
      (this.inputBuffer.length * this.options.targetSampleRate) /
        this.options.nativeSampleRate >=
      this.options.targetFrameSize
    )
  }

  private generateOutputFrame(): { resampled: Float32Array, original: Float32Array } {
    const outputFrame = new Float32Array(this.options.targetFrameSize)
    let outputIndex = 0
    let inputIndex = 0

    while (outputIndex < this.options.targetFrameSize) {
      let sum = 0
      let num = 0
      while (
        inputIndex <
        Math.min(
          this.inputBuffer.length,
          ((outputIndex + 1) * this.options.nativeSampleRate) /
            this.options.targetSampleRate
        )
      ) {
        const value = this.inputBuffer[inputIndex]
        if (value !== undefined) {
          sum += value
          num++
        }
        inputIndex++
      }
      outputFrame[outputIndex] = sum / num
      outputIndex++
    }

    const rawFrame = new Float32Array(this.inputBuffer.slice(0, inputIndex));

    this.inputBuffer = this.inputBuffer.slice(inputIndex);

    return {
      resampled: outputFrame,  
      original:  rawFrame      
    };
  }
}
