function getFrameByEvent(event: MessageEvent) {
  return [...document.getElementsByTagName('iframe')].filter((iframe) => {
    return iframe.contentWindow === event.source;
  })[0];
}

// TODO add more messages! send in jsonified Python data

// Each embed gets its own event listener.
export function listenToSizeAndValues(
  iframe: HTMLIFrameElement,
  onValues: (values: any) => void
): void {
  function onMessage(msg: MessageEvent) {
    if (!document.body.contains(iframe)) {
      // iframe is gone
      removeEventListener('message', onMessage);
    }
    const senderIframe = getFrameByEvent(msg);
    if (msg.data.type === 'iframeSize' && senderIframe === iframe) {
      console.log('setting iframe height to', msg.data.height);
      iframe.height = msg.data.height;
    } else if (msg.data.type === 'allValues' && senderIframe === iframe) {
      onValues(msg.data.allValues);
    }
  }

  window.addEventListener('message', onMessage);
}
