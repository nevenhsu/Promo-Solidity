import { differenceInSeconds } from 'date-fns'

class Counter {
  startTime: Date | undefined
  endTime: Date | undefined

  get diffSec(): number {
    const startT = this.startTime || new Date()
    const endT = this.endTime || new Date()

    return differenceInSeconds(endT, startT)
  }

  constructor(auto = true) {
    if (auto) {
      this.startTime = new Date()
    }
  }

  start() {
    this.startTime = new Date()
  }

  end() {
    this.endTime = new Date()
  }
}

export default Counter
