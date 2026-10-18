// I7: mainnet is not selectable before launch. The option is disabled, and a stored mainnet choice is reset
// to testnet when the selector mounts, so the tools never see mainnet from the shell.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { useNetwork } from '@meddleware/wallet-adapter'
import NetworkSelector from '../src/components/NetworkSelector.vue'

describe('NetworkSelector', () => {
  beforeEach(() => {
    useNetwork().setNetwork('testnet')
  })

  it('offers testnet and localnet, and lists mainnet as disabled', () => {
    const select = mount(NetworkSelector).get('select')
    const option = (value: string) => select.get(`option[value="${value}"]`)
    expect(option('testnet').attributes('disabled')).toBeUndefined()
    expect(option('localnet').attributes('disabled')).toBeUndefined()
    expect(option('mainnet').attributes('disabled')).toBeDefined()
  })

  it('resets a stored mainnet choice to testnet on mount', () => {
    const { network, setNetwork } = useNetwork()
    setNetwork('mainnet')
    expect(network.value).toBe('mainnet')
    mount(NetworkSelector)
    expect(network.value).toBe('testnet')
  })

  it('writes the chosen network to the shared singleton', async () => {
    const { network } = useNetwork()
    const wrapper = mount(NetworkSelector)
    await wrapper.get('select').setValue('localnet')
    expect(network.value).toBe('localnet')
    expect(wrapper.find('input[type="url"]').exists()).toBe(true)
  })
})
