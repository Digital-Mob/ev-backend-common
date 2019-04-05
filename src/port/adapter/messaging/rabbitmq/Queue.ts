import { Options, Message, Replies } from "amqplib";
import Exchange from "./Exchange";
import BrokerChannel from "./BrokerChannel";
import ConnectionSetting from "./ConnectionSetting";
import MessageListener from "./MessageListener";
import Constant from "./Constant";
import * as BluebirdPromise from "bluebird";

/** I'm using it to display errors, if the specified environment variable 'DEBUG' is set
 * so the provided tag. Here I used 'error'. So if you want to see erros on your console,
 * then just set your environment variable to 'set DEBUG=error'
 */
const debugError = require("debug")("error");

/**
 * I am a queue that simplifies RabbitMQ queues.
 *
 * @author Arkan M. Gerges <arkan.m.gerges@gmail.com>
 */
export default class Queue extends BrokerChannel {
	/**
	 * Answers a promise for a new instance of a Queue with a __*name*__. The underlying
	 * queue durability, exclusivity, and deletion properties are specified by
	 * explicit parameters.
	 * @param connectionSetting The ConnectionSetting used to create a queue
	 * @param name The name of the queue
	 * @param isDurable The boolean indicating whether or not I am durable
	 * @param isExclusive The boolean indicating whether or not I am exclusive
	 * @param isAutoDeleted The boolean indicating whether or not I should be auto-deleted
	 * @return Promise<Queue>
	 */
	public static customInstanceUsingConnectionSetting(
		connectionSetting: ConnectionSetting,
		name: string,
		isDurable: boolean = true,
		isExclusive: boolean = false,
		isAutoDeleted: boolean = false
	): Promise<Queue> {
		return new Promise(
			async (resolve, reject): Promise<void> => {
				if (name == null || name == "") {
					reject(Constant.INDIVIDUAL_SUBSCRIBER_MUST_HAS_NAME);
				} else {
					let queue: Queue = new this(connectionSetting, null, name);
					try {
						await queue.build();
						queue
							.constructQueueAssertion(isDurable, isExclusive, isAutoDeleted)
							.then((): void => resolve(queue))
							.catch(
								(e): void => {
									debugError(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
									reject(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
								}
							);
					} catch (e) {
						debugError(Constant.QUEUE_BUILD_THROWS_ERROR + e);
						reject(Constant.QUEUE_BUILD_THROWS_ERROR + e);
					}
				}
			}
		);
	}

	/**
	 * Answers a promise for a new instance of a Queue that is bound to an __*exchange*__, and
	 * is ready to participate as an exchange subscriber (pub/sub). The
	 * connection and channel of an *exchange* are reused. The Queue is named
	 * by __*name*__, unless it is empty, in which case the name is generated by
	 * the broker. The Queue is bound to all routing keys in __*routingKeys*__,
	 * or to no routing key if __*routingKeys*__ is empty. The Queue has the
	 * qualities specified by isDurable, isExclusive, isAutoDeleted. This
	 * factory is provided for ultimate flexibility in case no other
	 * exchange-queue binder factories fit the needs of the client.
	 * @param exchange the Exchange to bind with the new Queue
	 * @param name the name of the queue
	 * @param routingKeys the routing keys to bind the queue to
	 * @param isDurable the boolean indicating whether or not I am durable
	 * @param isExclusive the boolean indicating whether or not I am exclusive
	 * @param isAutoDeleted the boolean indicating whether or not I should be auto-deleted
	 * @return Promise<Queue>
	 */
	public static customInstanceUsingExchange(
		exchange: Exchange,
		name: string,
		routingKeys: string[] = [],
		isDurable: boolean = true,
		isExclusive: boolean = false,
		isAutoDeleted: boolean = false
	): Promise<Queue> {
		return new Promise(
			async (resolve, reject): Promise<void> => {
				if (name == null || name == "") {
					reject(Constant.INDIVIDUAL_SUBSCRIBER_MUST_HAS_NAME);
				} else {
					try {
						let queue: Queue = new this(null, exchange, name);
						await queue.build();
						queue
							.constructQueueAssertion(isDurable, isExclusive, isAutoDeleted)
							.then(
								(): void => {
									Promise.all(
										routingKeys.map(
											(routingKey): BluebirdPromise<Replies.Empty> => {
												return queue
													.channel()
													.bindQueue(queue.name(), exchange.name(), routingKey);
											}
										)
									)
										.then((): void => resolve(queue))
										.catch(
											(e): void =>
												reject(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e)
										);
								}
							)
							.catch(
								(e): void => {
									debugError(
										Constant.PROMISE_ALL_FAILED_TO_BIND_QUEUE_TO_EXCHANGE + e
									);
									reject(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
								}
							);
					} catch (e) {
						reject(Constant.QUEUE_BUILD_THROWS_ERROR + e);
					}
				}
			}
		);
	}

	/**
	 * Answers a promise for a new instance of a Queue with the name __*name*__. The underlying
	 * queue is durable, is non-exclusive, and not auto-deleted.
	 * @param connectionSetting The ConnectionSetting used to create the queue
	 * @param name The name of the queue
	 * @return Promise<Queue>
	 */
	public static durableInstance(
		connectionSetting: ConnectionSetting,
		name: string
	): Promise<Queue> {
		return new Promise(
			async (resolve, reject): Promise<void> => {
				if (name == null || name == "") {
					reject(Constant.INDIVIDUAL_SUBSCRIBER_MUST_HAS_NAME);
				} else {
					try {
						let queue: Queue = new this(connectionSetting, null, name);
						await queue.build();
						queue
							.constructQueueAssertion(true, false, false)
							.then((): void => resolve(queue))
							.catch(
								(e): void => {
									debugError(Constant.FAILED_ASSERT_QUEUE + e);
									reject(Constant.FAILED_ASSERT_QUEUE + e);
								}
							);
					} catch (e) {
						debugError(Constant.QUEUE_BUILD_THROWS_ERROR + e);
						reject(Constant.QUEUE_BUILD_THROWS_ERROR + e);
					}
				}
			}
		);
	}

	/**
	 * Answers a promise for a new instance of a Queue with the name __*name*__. The underlying
	 * queue is durable, exclusive, and not auto-deleted.
	 * @param connectionSetting The ConnectionSetting in order to create the queue
	 * @param name The name of the queue
	 * @return Promise<Queue>
	 */
	public static durableExclusiveInstance(
		connectionSetting: ConnectionSetting,
		name: string
	): Promise<Queue> {
		return new Promise(
			async (resolve, reject): Promise<void> => {
				if (name == null || name == "") {
					reject(Constant.INDIVIDUAL_SUBSCRIBER_MUST_HAS_NAME);
				} else {
					try {
						let queue: Queue = new this(connectionSetting, null, name);
						await queue.build();
						queue
							.constructQueueAssertion(true, true, false)
							.then((): void => resolve(queue))
							.catch(
								(e): void => {
									debugError(Constant.FAILED_ASSERT_QUEUE + e);
									reject(Constant.FAILED_ASSERT_QUEUE + e);
								}
							);
					} catch (e) {
						debugError(Constant.QUEUE_BUILD_THROWS_ERROR + e);
						reject(Constant.QUEUE_BUILD_THROWS_ERROR + e);
					}
				}
			}
		);
	}

	/**
	 * Answers a promise for a new instance of a Queue with the name __*name*__. The underlying
	 * queue is durable, is non-exclusive, and not auto-deleted.
	 * @param connectionSetting The ConnectionSetting for creating the queue
	 * @param name The name of the queue
	 * @return Promise<Queue>
	 */
	public static durableNonExclusiveNotAutoDeletedInstance(
		connectionSetting: ConnectionSetting,
		name: string
	): Promise<Queue> {
		return new Promise(
			async (resolve, reject): Promise<void> => {
				if (name == null || name == "") {
					reject(Constant.INDIVIDUAL_SUBSCRIBER_MUST_HAS_NAME);
				} else {
					try {
						let queue: Queue = new this(connectionSetting, null, name);
						await queue.build();
						queue
							.constructQueueAssertion(true, false, false)
							.then((): void => resolve(queue))
							.catch(
								(e): void => {
									debugError(Constant.FAILED_ASSERT_QUEUE + e);
									reject(Constant.FAILED_ASSERT_QUEUE + e);
								}
							);
					} catch (e) {
						reject(Constant.QUEUE_BUILD_THROWS_ERROR + e);
					}
				}
			}
		);
	}

	/**
	 * Answers a promise for a new instance of a Queue that is bound to __*exchange*__, and
	 * is ready to participate as an exchange subscriber (pub/sub). The
	 * connection and channel of __*exchange*__ are reused. The Queue is
	 * by __*name*__, which must be provided and should be unique to the
	 * individual subscriber. The queue is bound to all routing keys in
	 * __*routingKeys*__. The Queue is durable, non-exclusive, and is not
	 * auto-deleted. This Queue style best works as a durable direct or
	 * topic exchange subscriber.
	 * @param exchange The exchange to bind with the new Queue
	 * @param name The string name of the queue, which must be unique, non-empty
	 * @param routingKeys The routing keys to bind the queue to
	 * @return Promise<Queue>
	 */
	public static individualExchangeSubscriberInstance(
		exchange: Exchange,
		name: string,
		routingKeys: string[] = []
	): Promise<Queue> {
		return new Promise(
			async (resolve, reject): Promise<void> => {
				if (name == null || name == "") {
					reject(Constant.INDIVIDUAL_SUBSCRIBER_MUST_HAS_NAME);
				} else {
					try {
						let queue: Queue = new this(null, exchange, name);
						await queue.build();
						queue
							.constructQueueAssertion(true, false, false)
							.then(
								(): void => {
									Promise.all(
										routingKeys.map((routingKey): BluebirdPromise<Replies.Empty> => {
											return queue
												.channel()
												.bindQueue(queue.name(), exchange.name(), routingKey);
										})
									)
										.then((): void => resolve(queue))
										.catch((e): void => {
											debugError(
												Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e
											);
											reject(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
										});
								}
							)
							.catch(
								(e): void => {
									debugError(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
									reject(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
								}
							);
					} catch (e) {
						debugError(Constant.QUEUE_BUILD_THROWS_ERROR + e);
						reject(Constant.QUEUE_BUILD_THROWS_ERROR + e);
					}
				}
			}
		);
	}

	/**
	 * Answers a promise for a new instance of a Queue that is bound to __*exchange*__, and
	 * is ready to participate as an exchange subscriber (pub/sub). The
	 * connection and channel of __*exchange*__ are reused. The Queue is
	 * uniquely named by the server, non-durable, exclusive, and auto-deleted.
	 * This Queue style best works as a temporary fan-out subscriber.
	 * @param exchange The Exchange to bind with the new Queue
	 * @return Promise<Queue>
	 */
	public static exchangeTemporarySubscriberInstance(
		exchange: Exchange
	): Promise<Queue> {
		return new Promise(
			async (resolve, reject): Promise<void> => {
				try {
					let queue: Queue = new this(null, exchange, "");
					await queue.build();
					queue
						.constructQueueAssertion(false, true, true)
						.then(
							(): void => {
								queue
									.channel()
									.bindQueue(queue.name(), exchange.name(), "")
									.then((): void => resolve(queue))
									.catch(
										(e): void => {
											debugError(
												Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e
											);
											reject(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
										}
									);
							}
						)
						.catch(
							(e): void => {
								debugError(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
								reject(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
							}
						);
				} catch (e) {
					debugError(Constant.QUEUE_BUILD_THROWS_ERROR + e);
					reject(Constant.QUEUE_BUILD_THROWS_ERROR + e);
				}
			}
		);
	}

	/**
	 * Answers a promise for a new instance of a Queue that is bound to __*exchange*__, and
	 * is ready to participate as an exchange subscriber (pub/sub). The
	 * connection and channel of __*exchange*__ are reused. The Queue is
	 * named by __*name*__, which must be provided and should be unique to the
	 * individual subscriber. The Queue is durable, non-exclusive, and
	 * is not auto-deleted. This Queue style best works as a durable
	 * fan-out exchange subscriber.
	 * @param exchange The Exchange to bind with the new Queue
	 * @param name The String name of the queue, which must be unique, non-empty
	 * @return Promise<Queue>
	 */
	public static exchangeNamedSubscriberInstance(
		exchange: Exchange,
		name: string
	): Promise<Queue> {
		return new Promise(
			async (resolve, reject): Promise<void> => {
				try {
					let queue: Queue = new this(null, exchange, name);
					await queue.build();
					queue
						.constructQueueAssertion(true, false, false)
						.then(
							(): void => {
								queue
									.channel()
									.bindQueue(queue.name(), exchange.name(), "")
									.then((): void => resolve(queue))
									.catch(
										(e): void => {
											debugError(
												Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e
											);
											reject(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
										}
									);
							}
						)
						.catch(
							(e): void => {
								debugError(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
								reject(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
							}
						);
				} catch (e) {
					debugError(Constant.QUEUE_BUILD_THROWS_ERROR + e);
					reject(Constant.QUEUE_BUILD_THROWS_ERROR + e);
				}
			}
		);
	}

	/**
	 * Answers a promise for a new instance of a Queue that is bound to __*exchange*__, and
	 * is ready to participate as an exchange subscriber (pub/sub). The
	 * connection and channel of __*exchange*__ are reused. The Queue is
	 * uniquely named by the server, non-durable, exclusive, and auto-deleted.
	 * The queue is bound to all routing keys in __*routingKeys*__. This Queue
	 * style best works as a temporary direct or topic subscriber.
	 * @param exchange The Exchange to bind with the new Queue
	 * @param routingKeys The routing keys to bind the queue to
	 * @return Promise<Queue>
	 */
	public static exchangeTemporaryDirectOrTopicSubscriberInstance(
		exchange: Exchange,
		routingKeys: string[]
	): Promise<Queue> {
		return new Promise(
			async (resolve, reject): Promise<void> => {
				try {
					let queue: Queue = new this(null, exchange, "");
					await queue.build();
					queue
						.constructQueueAssertion(false, true, true)
						.then(
							(): void => {
								Promise.all(
									routingKeys.map(
										(routingKey): BluebirdPromise<Replies.Empty> => {
											return queue
												.channel()
												.bindQueue(queue.name(), exchange.name(), routingKey);
										}
									)
								)
									.then((): void => resolve(queue))
									.catch(
										(e): void => {
											debugError(
												Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e
											);
											reject(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
										}
									);
							}
						)
						.catch(
							(e): void => {
								debugError(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
								reject(Constant.FAILED_BINDING_QUEUE_AND_EXCHANGE + e);
							}
						);
				} catch (e) {
					debugError(Constant.QUEUE_BUILD_THROWS_ERROR + e);
					reject(Constant.QUEUE_BUILD_THROWS_ERROR + e);
				}
			}
		);
	}

	/**
	 * Consume messages using a __*messageListener*__
	 * @param messageListener This is the listener that will handle the messages
	 * @param ack This is the callback that is used to acknowledge the message manually
	 * @param options The different types of options available for the consumer
	 * @return Promise<void>
	 */
	public consume(
		messageListener: MessageListener,
		ack: (message: Message) => void,
		options?: Options.Consume
	): Promise<void> {
		return new Promise(
			(resolve, reject): void => {
				this.channel()
					.consume(
						this.name(),
						(msg: Message): void => {
							messageListener.setCurrentMessage(msg);
							try {
								messageListener.handleMessage(msg, ack);
							} catch (e) {
								this.emit(Constant.MESSAGE_CONSUMER_ERROR_EVENT_NAME, e);
							}
						},
						options
					)
					.then((): void => resolve())
					.catch(
						(e): void => {
							/** An error has occurred when channel.consume() is called */
							debugError(Constant.CHANNEL_CONSUME_ERROR, e);
							reject(e);
						}
					);
			}
		);
	}

	/** Close the channel and also the connection for this queue */
	public close(): void {
		super.close();
	}

	/**
	 * Negative acknowledgment with the possibility to requeue the message
	 * @param message The message structure used for negative acknowledgment
	 * @param reqeue The boolean to indicate if it is needed to requeue the message
	 */
	public nack(message: Message, reqeue: boolean): void {
		this.channel().nack(message, false, reqeue);
	}

	/**
	 * Acknowledge this __*message*__
	 * @param message The Message structure that is acknowledged by me
	 */
	public ack(message: Message): void {
		this.channel().ack(message);
	}

	/**
	 * Set a prefetch per channel, which represents the number of messages in the queue
	 * that this queue channel can handle.
	 * @param count The number of messages that are allowed to be prefeched
	 */
	public basicQos(count: number): void {
		this.channel().prefetch(count);
	}

	protected constructor(
		connectionSetting: ConnectionSetting,
		brokerChannel: BrokerChannel,
		name: string
	) {
		if (connectionSetting != null) {
			super(connectionSetting, name);
		} else {
			super(null, name, brokerChannel);
		}
	}

	private async constructQueueAssertion(
		isDurable: boolean,
		isExclusive: boolean,
		isAutoDeleted: boolean
	): Promise<void> {
		this.setDurable(isDurable);
		try {
			let queueReply = await this.channel().assertQueue(this.name(), {
				durable: isDurable,
				exclusive: isExclusive,
				autoDelete: isAutoDeleted
			});
			this.setName(queueReply.queue);
		} catch (e) {
			throw new Error(Constant.FAILED_ASSERT_QUEUE + e);
		}
	}
}