import { View, Text } from '@tarojs/components';
import { Component } from 'react';
import './index.scss';

export default class Index extends Component {
  render() {
    return (
      <View className='index'>
        <Text>Hello SmartGrade!</Text>
      </View>
    );
  }
}