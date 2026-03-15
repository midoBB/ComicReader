package config

import (
	"flag"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Config struct {
	LibraryPath string `yaml:"library_path"`
	Port        int    `yaml:"port"`
	Host        string `yaml:"host"`
	DBPath      string `yaml:"-"`
}

func Load() (*Config, error) {
	configPath := flag.String("config", "config.yaml", "path to config file")
	flag.Parse()

	absConfig, err := filepath.Abs(*configPath)
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(absConfig)
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		Port: 8386,
		Host: "0.0.0.0",
	}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, err
	}
	cfg.DBPath = filepath.Join(filepath.Dir(absConfig), "data.db")
	return cfg, nil
}
