import { getAddress, getCreate2Address, keccak256 } from 'viem'
import { encodeAbiParameters, parseAbiParameters } from 'viem'
import clubTokenJson from '@/artifacts/contracts/ClubToken.sol/ClubToken.json'
import type { Hash } from 'viem'

export function computeTokenAddress({ contract, owner }: { contract: string; owner: string }) {
  const from = getAddress(contract)
  const salt = keccak256(encodeAbiParameters(parseAbiParameters('address'), [getAddress(owner)]))

  return getCreate2Address({
    from,
    salt,
    bytecode: clubTokenJson.bytecode as Hash,
  })
}
