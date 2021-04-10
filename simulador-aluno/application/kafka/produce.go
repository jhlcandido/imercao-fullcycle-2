package kafka

import (
	"encoding/json"
	"log"
	"os"
	"time"

	ckafka "github.com/confluentinc/confluent-kafka-go/kafka"
	"github.com/jhlcandido/imersaofsfc2-simulator/application/route"
	"github.com/jhlcandido/imersaofsfc2-simulator/infra/kafka"
)

//{"clientId":"1","routeId":"1"}
//{"clientId":"2","routeId":"2"}

func Produce(msg *ckafka.Message) {
	producer := kafka.NewKafkaProducer()
	route := route.NewRoute()
	json.Unmarshal(msg.Value, &route)
	route.LoadPositions()
	positions, err := route.ExportJsonPositions()

	if err != nil {
		log.Panicln(err.Error())
	}

	for _, p := range positions {
		kafka.Publish(p, os.Getenv("KafkaProduceTopic"), producer)
		time.Sleep(time.Millisecond * 500)
	}
}
