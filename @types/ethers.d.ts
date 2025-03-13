import type { LogDescription } from 'ethers'

declare module 'ethers' {
  interface Interface {
    parseLog(log: { topics: ReadonlyArray<string>; data: string }): null | LogDescription
  }
}
