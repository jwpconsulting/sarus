// File Dependencies
import Sarus, { SarusClassParams } from "../../src/index";
import { WS } from "jest-websocket-mock";

const url = "ws://localhost:1234";

describe("message queue", () => {
  //Implement message queue with in-memory as default
  it("should queue messages for delivery", async () => {
    const server = new WS(url);
    const sarus = new Sarus({ url });
    await server.connected;
    sarus.send("Hello server");
    await expect(server).toReceiveMessage("Hello server");
    sarus.ws.close();
    sarus.send("Hello again");
    await server.connected;
    await expect(server).toReceiveMessage("Hello again");
    await server.close();
  });

  it("should queue messages for delivery when server is offline for a bit", async () => {
    const server = new WS(url);
    const sarus = new Sarus({ url });
    await server.connected;
    sarus.send("Hello server");
    await expect(server).toReceiveMessage("Hello server");
    await server.close();
    sarus.send("Hello again");
    sarus.send("Here is another message");
    expect(sarus.messages).toEqual(["Hello again", "Here is another message"]);
    const newServer = new WS(url);
    const messageOne = await server.nextMessage;
    const messageTwo = await server.nextMessage;
    expect(messageOne).toBe("Hello again");
    expect(messageTwo).toBe("Here is another message");
    expect(sarus.messages).toEqual([]);
    await newServer.close();
  });

  it("should allow the developer to provide a custom retryProcessTimePeriod", () => {
    const sarus = new Sarus({ url, retryProcessTimePeriod: 25 });
    expect(sarus.retryProcessTimePeriod).toBe(25);
  });

  // it("should throw an error if the retryProcessTimePeriod is not a number", () => {
  //   const initializeBadConfig = () => {
  //     return new Sarus({ url, retryProcessTimePeriod: "10" });
  //   };
  //   expect(initializeBadConfig).toThrowError();
  // });

  const applyStorageTest = async (
    storageType: any,
    sarusConfig: SarusClassParams
  ) => {
    storageType.clear();
    const server = new WS(url);
    const sarus = new Sarus(sarusConfig);
    expect(sarus.storageType).toBe(sarusConfig.storageType);
    await server.connected;
    sarus.send("Hello server");
    await expect(server).toReceiveMessage("Hello server");
    await server.close();
    sarus.send("Hello again");
    sarus.send("Here is another message");
    expect(sarus.messages).toEqual(["Hello again", "Here is another message"]);
    const newServer = new WS(url);
    const messageOne = await server.nextMessage;
    const messageTwo = await server.nextMessage;
    expect(sarus.messages).toEqual([]);
    expect(messageOne).toBe("Hello again");
    expect(messageTwo).toBe("Here is another message");
    await newServer.close();
  };

  it("should allow the developer to use sessionStorage for storing messages", async () => {
    await applyStorageTest(sessionStorage, { url, storageType: "session" });
  });

  it("should allow the developer to use localStorage for storing messages", async () => {
    await applyStorageTest(localStorage, { url, storageType: "local" });
  });

  it("should allow the developer to use a custom storageKey", () => {
    const sarus = new Sarus({
      url,
      storageType: "local",
      storageKey: "sarusWS"
    });
    expect(sarus.storageKey).toBe("sarusWS");
  });

  const retrieveMessagesFromStorage = (sarusConfig: SarusClassParams) => {
    let sarusOne = new Sarus(sarusConfig);
    sarusOne.send("Hello world");
    sarusOne.send("Hello again");
    sarusOne.disconnect();
    const sarusTwo = new Sarus(sarusConfig);
    expect(sarusTwo.messages).toEqual(["Hello world", "Hello again"]);
    return sarusTwo;
  };

  const processExistingMessagesFromStorage = async (
    storageType,
    sarusConfig
  ) => {
    storageType.clear();
    const sarusTwo = retrieveMessagesFromStorage(sarusConfig);
    const server = new WS(url);
    const messageOne = await server.nextMessage;
    const messageTwo = await server.nextMessage;
    expect(sarusTwo.messages).toEqual([]);
    expect(messageOne).toBe("Hello world");
    expect(messageTwo).toBe("Hello again");
    await server.close();
    WS.clean();
  };

  it("should load any existing messages from previous sessionStorage on initialization", () => {
    retrieveMessagesFromStorage({ url, storageType: "session" });
  });

  it("should load any existing messages from previous localStorage on initialization", () => {
    retrieveMessagesFromStorage({ url, storageType: "local" });
  });

  it("should process any existing messages from previous sessionStorage on initialization", async () => {
    await processExistingMessagesFromStorage(sessionStorage, {
      url,
      storageType: "session",
      reconnectAutomatically: true
    });
  });

  it("should process any existing messages from previous localStorage on initialization", async () => {
    await processExistingMessagesFromStorage(localStorage, {
      url,
      storageType: "local",
      reconnectAutomatically: true
    });
  });
});
