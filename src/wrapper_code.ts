function getFrameByEvent(event: MessageEvent) {
  return [...document.getElementsByTagName('iframe')].filter((iframe) => {
    return iframe.contentWindow === event.source;
  })[0];
}

// Each embed gets its own event listener.
export function listenToSizeAndValuesAndReady(
  iframe: HTMLIFrameElement,
  onValues: (values: any) => void,
  onReady: () => void
): void {
  function onMessage(msg: MessageEvent) {
    if (!document.body.contains(iframe)) {
      // iframe is gone
      removeEventListener('message', onMessage);
    }
    const senderIframe = getFrameByEvent(msg);
    if (msg.data.type === 'iframeSize' && senderIframe === iframe) {
      iframe.height = msg.data.height;
    } else if (msg.data.type === 'outputs' && senderIframe === iframe) {
      onValues(msg.data.outputs);
    } else if (msg.data.type === 'ready' && senderIframe === iframe) {
      onReady();
    }
  }

  window.addEventListener('message', onMessage);
}

export function sendInputs(
  iframe: HTMLIFrameElement,
  inputs: Record<string, any>
): void {
  // TODO error handing when these cannot be serialized!
  iframe.contentWindow!.postMessage(
    {
      type: 'inputs',
      inputs,
    },
    '*'
  );
}
